import type {
  TutorTool,
  TutorToolContext,
  TutorToolId,
  TutorToolRequest,
  TutorToolResult,
} from "./tools.js";

export class ToolRegistry {
  private readonly tools = new Map<TutorToolId, TutorTool>();

  register(tool: TutorTool): void {
    if (this.tools.has(tool.id)) {
      throw new Error(`Tutor tool already registered: ${tool.id}`);
    }
    this.tools.set(tool.id, tool);
  }

  get(id: TutorToolId): TutorTool {
    const tool = this.tools.get(id);
    if (!tool) {
      throw new Error(`Tutor tool not registered: ${id}`);
    }
    return tool;
  }

  async execute<TInput = unknown>(
    request: TutorToolRequest<TInput>,
    authorize: (tool: TutorTool, context: TutorToolContext) => Promise<boolean>,
  ): Promise<TutorToolResult> {
    const tool = this.get(request.toolId);

    if (!(await authorize(tool, request.context))) {
      throw new Error(`Tutor tool access denied: ${request.toolId}`);
    }

    return tool.execute(request);
  }

  list(): TutorToolId[] {
    return [...this.tools.keys()];
  }
}
