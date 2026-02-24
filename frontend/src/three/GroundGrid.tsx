import { Grid } from '@react-three/drei';

export default function GroundGrid() {
  return (
    <Grid
      position={[0, -1.2, 0]}
      args={[10, 10]}
      cellSize={0.5}
      cellThickness={0.5}
      cellColor="#1e293b"
      sectionSize={2}
      sectionThickness={1}
      sectionColor="#334155"
      fadeDistance={8}
      fadeStrength={1}
      infiniteGrid
    />
  );
}
