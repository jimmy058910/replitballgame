import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";

// Example component test
describe("Example Component Tests", () => {
  const createTestQueryClient = () =>
    new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

  const TestWrapper = ({ children }: { children: React.ReactNode }) => {
    const queryClient = createTestQueryClient();
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };

  it("should render a simple button", () => {
    const Button = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
      <button onClick={onClick}>{children}</button>
    );

    const mockFn = vi.fn();
    render(<Button onClick={mockFn}>Click me</Button>);
    
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("should handle user interactions", async () => {
    const user = userEvent.setup();
    let clicked = false;
    
    const Button = ({ onClick }: { onClick: () => void }) => (
      <button onClick={onClick}>Click me</button>
    );
    
    const mockFn = vi.fn(() => { clicked = true; });
    render(<Button onClick={mockFn} />);
    
    await user.click(screen.getByText("Click me"));
    expect(mockFn).toHaveBeenCalledOnce();
    expect(clicked).toBe(true);
  });
});