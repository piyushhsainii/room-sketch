// // migrateToMultiFloor.test.ts
// import {
//   migrateToMultiFloor,
//   recomputeFloorElevations,
// } from "./migrateToMultiFloor";
// import { DEFAULT_FP } from "@/components/workspace/lib/constants";

// describe("migrateToMultiFloor", () => {
//   it("wraps a bare FloorPlanState as a single Ground Floor", () => {
//     const oldState = { ...DEFAULT_FP, roomHeight: 2.8 };
//     const result = migrateToMultiFloor(oldState);

//     expect(result.floors).toHaveLength(1);
//     expect(result.floors[0].label).toBe("Ground Floor");
//     expect(result.floors[0].order).toBe(0);
//     expect(result.floors[0].elevation).toBe(0);
//     expect(result.floors[0].state).toBe(oldState); // same reference, not cloned
//     expect(result.activeFloorId).toBe(result.floors[0].id);
//     expect(result.viewMode).toBe("single");
//   });

//   it("is idempotent — returns already-migrated data unchanged", () => {
//     const already = migrateToMultiFloor({ ...DEFAULT_FP });
//     const result = migrateToMultiFloor(already);
//     expect(result).toBe(already);
//   });
// });

// describe("recomputeFloorElevations", () => {
//   it("stacks floors by roomHeight in order", () => {
//     const floors = [
//       {
//         id: "a",
//         label: "Ground",
//         order: 0,
//         elevation: 0,
//         visible: true,
//         state: { ...DEFAULT_FP, roomHeight: 2.8 },
//       },
//       {
//         id: "b",
//         label: "Level 2",
//         order: 1,
//         elevation: 0,
//         visible: true,
//         state: { ...DEFAULT_FP, roomHeight: 3.0 },
//       },
//     ];
//     const result = recomputeFloorElevations(floors);
//     expect(result[0].elevation).toBe(0);
//     expect(result[1].elevation).toBe(2.8);
//   });

//   it("respects manually overridden elevations", () => {
//     const floors = [
//       {
//         id: "a",
//         label: "Ground",
//         order: 0,
//         elevation: 0,
//         visible: true,
//         state: { ...DEFAULT_FP, roomHeight: 2.8 },
//       },
//       {
//         id: "b",
//         label: "Level 2",
//         order: 1,
//         elevation: 5,
//         visible: true,
//         state: { ...DEFAULT_FP, roomHeight: 3.0 },
//       },
//     ];
//     const result = recomputeFloorElevations(floors, new Set(["b"]));
//     expect(result[1].elevation).toBe(5); // untouched
//   });
// });
