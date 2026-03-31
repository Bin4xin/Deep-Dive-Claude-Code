export interface SimStep {
  type: "user_message" | "assistant_text" | "tool_call" | "tool_result" | "system_event";
  content: string;
  toolName?: string;
  annotation: string;
}

export interface Scenario {
  version: string;
  title: string;
  description: string;
  steps: SimStep[];
}
