import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTestManagerStore } from "../store/testManagerStore";
import * as testManagerApi from "../services/testManagerApi";
import { Priority, Status, TestCaseResponse } from "../types/api/testManager.api";
import { TestCase, Priority as UIPriority, Status as UIStatus } from "../types/testManager";

vi.mock("zustand/middleware", async () => {
  const actual = await vi.importActual<typeof import("zustand/middleware")>("zustand/middleware");

  return {
    ...actual,
    persist: ((stateCreator: unknown) => stateCreator) as typeof actual.persist,
  };
});

vi.mock("../services/testManagerApi", () => ({
  createTestCase: vi.fn(),
}));

const buildResponse = (overrides: Partial<TestCaseResponse> = {}): TestCaseResponse => ({
  id: "tc-1",
  title: "Create login test",
  priority: Priority.Medium,
  status: Status.Draft,
  projectId: "project-1",
  suiteId: "suite-1",
  suite: "Authentication",
  assignedTester: { id: "u-1", name: "QA", avatar: "" },
  area: "",
  expectedResult: "",
  testDescription: "",
  stepsContent: "",
  comments: "",
  customFields: {},
  history: [],
  order: 0,
  lastModified: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("testManagerStore createTestCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTestManagerStore.setState({ testCases: [], isLoading: false, error: null });
  });

  it("adds created test case when id is new", async () => {
    vi.mocked(testManagerApi.createTestCase).mockResolvedValueOnce(buildResponse());

    await useTestManagerStore.getState().createTestCase("suite-1", { title: "Create login test" });

    const cases = useTestManagerStore.getState().testCases;
    expect(cases).toHaveLength(1);
    expect(cases[0].id).toBe("tc-1");
  });

  it("does not add duplicate when same id already exists", async () => {
    useTestManagerStore.setState({
      testCases: [
        {
          id: "tc-1",
          title: "Create login test",
          priority: UIPriority.Medium,
          status: UIStatus.Draft,
          lastModified: "2026-01-01T00:00:00.000Z",
          createdAt: "2026-01-01T00:00:00.000Z",
          assignedTester: { id: "u-1", name: "QA", avatar: "" },
          steps: [],
          suite: "Authentication",
          suiteId: "suite-1",
          area: "",
          expectedResult: "",
          testDescription: "",
          comments: "",
          customFields: {},
          history: [],
          projectId: "project-1",
          order: 0,
        },
      ] as TestCase[],
    });
    vi.mocked(testManagerApi.createTestCase).mockResolvedValueOnce(buildResponse());

    await useTestManagerStore.getState().createTestCase("suite-1", { title: "Create login test" });

    const cases = useTestManagerStore.getState().testCases;
    expect(cases).toHaveLength(1);
    expect(cases[0].id).toBe("tc-1");
  });
});
