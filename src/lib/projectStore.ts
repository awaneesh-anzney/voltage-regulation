// SC Forces — Project & Test Case Store (In-Memory)
// Later: replace with API calls to backend DB

import type { SCInputs, SCResults } from "./scForcesEngine";

export interface TestCase {
  id: string;
  name: string;
  inputs: SCInputs;
  results: SCResults;
  createdAt: string;
  status: "pass" | "fail";
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  testCases: TestCase[];
}

// Generate unique ID
function genId(): string {
  return (
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).substring(2, 9)
  );
}

export function createProject(name: string): Project {
  return {
    id: genId(),
    name,
    createdAt: new Date().toISOString(),
    testCases: [],
  };
}

export function createTestCase(
  name: string,
  inputs: SCInputs,
  results: SCResults
): TestCase {
  return {
    id: genId(),
    name,
    inputs: { ...inputs },
    results: { ...results },
    createdAt: new Date().toISOString(),
    status: results.clCheck ? "pass" : "fail",
  };
}

export function addTestCaseToProject(
  projects: Project[],
  projectId: string,
  testCase: TestCase
): Project[] {
  return projects.map((p) =>
    p.id === projectId
      ? { ...p, testCases: [testCase, ...p.testCases] }
      : p
  );
}

export function deleteTestCaseFromProject(
  projects: Project[],
  projectId: string,
  testCaseId: string
): Project[] {
  return projects.map((p) =>
    p.id === projectId
      ? { ...p, testCases: p.testCases.filter((tc) => tc.id !== testCaseId) }
      : p
  );
}

export function deleteProject(
  projects: Project[],
  projectId: string
): Project[] {
  return projects.filter((p) => p.id !== projectId);
}
