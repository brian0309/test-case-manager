export interface ExampleResponse {
  success: boolean;
  message: string;
  timestamp: string;
  user?: {
    id: string;
    email: string;
  };
}
