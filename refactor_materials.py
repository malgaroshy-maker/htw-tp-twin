import re


def replace_materials(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    replacements = [
        (
            r"<meshStandardMaterial color=\{PALETTE\.frame\} metalness=\{0\.22\} roughness=\{0\.5\} />",
            "material={SHARED_MATERIALS.frame}",
        ),
        (
            r"<meshStandardMaterial color=\{PALETTE\.frameDark\} metalness=\{0\.18\} roughness=\{0\.58\} />",
            "material={SHARED_MATERIALS.frameDark}",
        ),
        (
            r"<meshStandardMaterial color=\{PALETTE\.cover\} metalness=\{0\.34\} roughness=\{0\.34\} />",
            "material={SHARED_MATERIALS.cover}",
        ),
        (
            r"<meshStandardMaterial color=\{PALETTE\.coverDark\} metalness=\{0\.28\} roughness=\{0\.34\} />",
            "material={SHARED_MATERIALS.coverDark}",
        ),
        (
            r'<meshStandardMaterial color=\{PALETTE\.rail\} roughness=\{0\.46\} metalness=\{0\.28\} emissive="#CBD5E1" emissiveIntensity=\{0\.02\} />',
            "material={SHARED_MATERIALS.rail}",
        ),
        (
            r"<meshStandardMaterial color=\{PALETTE\.cartonBase\} roughness=\{0\.8\} metalness=\{0\.06\} />",
            "material={SHARED_MATERIALS.cartonBase}",
        ),
        (
            r"<meshStandardMaterial color=\{PALETTE\.cartonFold\} roughness=\{0\.78\} metalness=\{0\.03\} />",
            "material={SHARED_MATERIALS.cartonFold}",
        ),
        (
            r"<meshStandardMaterial color=\{PALETTE\.cartonEdge\} roughness=\{0\.9\} metalness=\{0\.02\} />",
            "material={SHARED_MATERIALS.cartonEdge}",
        ),
        (
            r'<meshStandardMaterial color="#10B981" metalness=\{0\.3\} roughness=\{0\.3\} />',
            "material={SHARED_MATERIALS.product}",
        ),
        (
            r'<meshStandardMaterial color="#0F172A" roughness=\{0\.96\} metalness=\{0\.02\} />',
            "material={SHARED_MATERIALS.floor}",
        ),
    ]

    for pattern, replacement in replacements:
        # We need to replace the <mesh ...> \n <boxGeometry ...> \n <meshStandardMaterial ... />
        # with <mesh ... material={SHARED_MATERIALS.xxx}> \n <boxGeometry ...>
        # This is tricky because the material is a child of the mesh.
        # Let's just use regex to find the mesh tag and the material tag and merge them.
        pass

    # A simpler approach:
    # Find all <mesh ...> ... <meshStandardMaterial ... /> ... </mesh>
    # and replace with <mesh ... material={SHARED_MATERIALS.xxx}> ... </mesh>

    # Actually, let's just use a simpler regex that looks for the material tag and removes it,
    # while adding the material prop to the preceding <mesh> or <RoundedBox> tag.

    # Since this is a one-off refactor, I will write a state machine parser.
    lines = content.split("\n")
    out_lines = []

    material_map = {
        "<meshStandardMaterial color={PALETTE.frame} metalness={0.22} roughness={0.5} />": "SHARED_MATERIALS.frame",
        "<meshStandardMaterial color={PALETTE.frameDark} metalness={0.18} roughness={0.58} />": "SHARED_MATERIALS.frameDark",
        "<meshStandardMaterial color={PALETTE.cover} metalness={0.34} roughness={0.34} />": "SHARED_MATERIALS.cover",
        "<meshStandardMaterial color={PALETTE.coverDark} metalness={0.28} roughness={0.34} />": "SHARED_MATERIALS.coverDark",
        '<meshStandardMaterial color={PALETTE.rail} roughness={0.46} metalness={0.28} emissive="#CBD5E1" emissiveIntensity={0.02} />': "SHARED_MATERIALS.rail",
        "<meshStandardMaterial color={PALETTE.cartonBase} roughness={0.8} metalness={0.06} />": "SHARED_MATERIALS.cartonBase",
        "<meshStandardMaterial color={PALETTE.cartonFold} roughness={0.78} metalness={0.03} />": "SHARED_MATERIALS.cartonFold",
        "<meshStandardMaterial color={PALETTE.cartonEdge} roughness={0.9} metalness={0.02} />": "SHARED_MATERIALS.cartonEdge",
        '<meshStandardMaterial color="#10B981" metalness={0.3} roughness={0.3} />': "SHARED_MATERIALS.product",
        '<meshStandardMaterial color="#0F172A" roughness={0.96} metalness={0.02} />': "SHARED_MATERIALS.floor",
    }

    i = 0
    while i < len(lines):
        line = lines[i]

        # Check if the next few lines contain a matching material
        found_match = False
        if "<mesh " in line or "<mesh>" in line or "<RoundedBox " in line:
            for j in range(i + 1, min(i + 5, len(lines))):
                stripped = lines[j].strip()
                if stripped in material_map:
                    # We found a match!
                    mat_name = material_map[stripped]
                    # Add material prop to the mesh tag
                    if line.endswith(">"):
                        line = line[:-1] + f" material={{{mat_name}}}>"

                    out_lines.append(line)
                    # Add the lines in between
                    for k in range(i + 1, j):
                        out_lines.append(lines[k])
                    # Skip the material line
                    i = j + 1
                    found_match = True
                    break

        if not found_match:
            out_lines.append(line)
            i += 1

    with open(filepath, "w", encoding="utf-8") as f:
        f.write("\n".join(out_lines))
    print("Materials replaced.")


if __name__ == "__main__":
    replace_materials("app/dashboard/src/features/simulation/SimulationView3D.tsx")
