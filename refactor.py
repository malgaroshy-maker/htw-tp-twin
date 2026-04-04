import re
import sys


def refactor_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Remove the previously inserted block
    start_idx = content.find("// --- SHARED ASSETS FOR PERFORMANCE ---")
    end_idx = content.find("// -------------------------------------\n")
    if start_idx != -1 and end_idx != -1:
        content = (
            content[:start_idx]
            + content[end_idx + len("// -------------------------------------\n") :]
        )

    # Find PALETTE
    palette_end = content.find("} as const;")
    if palette_end == -1:
        print("Could not find PALETTE")
        return

    palette_end += len("} as const;")

    shared_assets = """

// --- SHARED ASSETS FOR PERFORMANCE ---
const GEOMETRIES = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 20),
  plane: new THREE.PlaneGeometry(1, 1),
};

const SHARED_MATERIALS = {
  frame: new THREE.MeshStandardMaterial({ color: PALETTE.frame, metalness: 0.22, roughness: 0.5 }),
  frameDark: new THREE.MeshStandardMaterial({ color: PALETTE.frameDark, metalness: 0.18, roughness: 0.58 }),
  cover: new THREE.MeshStandardMaterial({ color: PALETTE.cover, metalness: 0.34, roughness: 0.34 }),
  coverDark: new THREE.MeshStandardMaterial({ color: PALETTE.coverDark, metalness: 0.28, roughness: 0.34 }),
  rail: new THREE.MeshStandardMaterial({ color: PALETTE.rail, roughness: 0.46, metalness: 0.28 }),
  cartonBase: new THREE.MeshStandardMaterial({ color: PALETTE.cartonBase, roughness: 0.8, metalness: 0.06 }),
  cartonFold: new THREE.MeshStandardMaterial({ color: PALETTE.cartonFold, roughness: 0.78, metalness: 0.03 }),
  cartonEdge: new THREE.MeshStandardMaterial({ color: PALETTE.cartonEdge, roughness: 0.9, metalness: 0.02 }),
  product: new THREE.MeshStandardMaterial({ color: PALETTE.product, metalness: 0.28, roughness: 0.28 }),
  floor: new THREE.MeshStandardMaterial({ color: '#0F172A', roughness: 0.96, metalness: 0.02 }),
};
// -------------------------------------
"""
    content = content[:palette_end] + shared_assets + content[palette_end:]

    # Add ContactShadows to imports
    import_drei = content.find(
        "import { Environment, OrbitControls, OrthographicCamera, RoundedBox, Text } from '@react-three/drei';"
    )
    if import_drei != -1:
        content = content.replace(
            "import { Environment, OrbitControls, OrthographicCamera, RoundedBox, Text } from '@react-three/drei';",
            "import { Environment, OrbitControls, OrthographicCamera, RoundedBox, Text, ContactShadows } from '@react-three/drei';",
        )

    # Add fault light and ContactShadows
    env_idx = content.find('<Environment preset="warehouse" />')
    if env_idx != -1:
        replacement = """<Environment preset="studio" environmentIntensity={0.8} />
      <ContactShadows position={[0, -0.04, 0]} opacity={0.6} scale={40} blur={2} far={4} resolution={1024} color="#000000" />
      {model.faultCode && (
        <pointLight position={[0, 8, 0]} intensity={2} color="#EF4444" distance={20} decay={2} />
      )}"""
        content = (
            content[:env_idx]
            + replacement
            + content[env_idx + len('<Environment preset="warehouse" />') :]
        )

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print("Refactoring script applied basic changes.")


if __name__ == "__main__":
    refactor_file("app/dashboard/src/features/simulation/SimulationView3D.tsx")
