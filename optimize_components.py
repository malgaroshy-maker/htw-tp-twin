import re


def optimize_components(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Optimize GroupedLaneFill
    # Replace <meshStandardMaterial color="#10B981" metalness={0.3} roughness={0.3} />
    # with material={SHARED_MATERIALS.product}
    content = content.replace(
        '<meshStandardMaterial color="#10B981" metalness={0.3} roughness={0.3} />', ""
    )
    # We need to add material={SHARED_MATERIALS.product} to the mesh in GroupedLaneFill
    # Find: <mesh key={`${lane}-${slot}`} position={[...]} castShadow receiveShadow>
    # Replace: <mesh key={`${lane}-${slot}`} position={[...]} castShadow receiveShadow material={SHARED_MATERIALS.product}>
    content = re.sub(
        r"(<mesh key={`\$\{lane\}-\$\{slot\}`} position=\{[^}]+\} castShadow receiveShadow)>",
        r"\1 material={SHARED_MATERIALS.product}>",
        content,
    )

    # 2. Optimize ProductSlug
    # It currently has:
    # <meshStandardMaterial color="#10B981" emissive="#10B981" emissiveIntensity={0.12} metalness={0.28} roughness={0.28} transparent opacity={opacity} />
    # We will replace the whole ProductSlug function to use InstancedMesh!

    product_slug_replacement = """function ProductSlug({
  visible,
  x,
  opacity,
  rowCount,
  colCount,
  compression,
  productScale,
}: {
  visible: boolean;
  x: number;
  opacity: number;
  rowCount: number;
  colCount: number;
  compression: number;
  productScale: number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    if (!meshRef.current || !materialRef.current) return;
    
    materialRef.current.opacity = opacity;
    
    const rowSpacing = lerp(2.15, 0.95, compression);
    const zPositions = Array.from({ length: rowCount }, (_, lane) => lerp(-rowSpacing, rowSpacing, rowCount === 1 ? 0.5 : lane / (rowCount - 1)));
    
    let i = 0;
    for (let row = 0; row < rowCount; row++) {
      for (let col = 0; col < colCount; col++) {
        dummy.position.set(col * 0.54, 0, zPositions[row]);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i++, dummy.matrix);
      }
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (!visible) return null;
  
  return (
    <group position={[x, MACHINE_LAYOUT_3D.deckHeights.products, 0]}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, rowCount * colCount]} castShadow receiveShadow>
        <boxGeometry args={[productScale, productScale, productScale]} />
        <meshStandardMaterial ref={materialRef} color="#10B981" emissive="#10B981" emissiveIntensity={0.12} metalness={0.28} roughness={0.28} transparent />
      </instancedMesh>
    </group>
  );
}"""

    # Find the ProductSlug function and replace it
    start_idx = content.find("function ProductSlug({")
    end_idx = content.find("function FlatBlank({")
    if start_idx != -1 and end_idx != -1:
        content = (
            content[:start_idx] + product_slug_replacement + "\n\n" + content[end_idx:]
        )

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print("Optimized ProductSlug and GroupedLaneFill.")


if __name__ == "__main__":
    optimize_components("app/dashboard/src/features/simulation/SimulationView3D.tsx")
