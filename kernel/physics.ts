export type Physics = { gravity: number; temperature: number; collisions: number };
export function physicsStep(physics: Physics, population: number): Physics { return { gravity: physics.gravity, temperature: Math.max(0, physics.temperature + population * 0.00001 - 0.01), collisions: physics.collisions + Math.floor(population / 100) }; }
