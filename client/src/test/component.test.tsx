import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// Test a simple component from your app
describe("Component Tests", () => {
  it("should render and interact with a button component", async () => {
    const user = userEvent.setup();
    const mockClick = vi.fn();
    
    // Simple button component for testing
    const TestButton = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
      <button onClick={onClick} data-testid="test-button">
        {children}
      </button>
    );
    
    render(<TestButton onClick={mockClick}>Test Button</TestButton>);
    
    const button = screen.getByTestId("test-button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("Test Button");
    
    await user.click(button);
    expect(mockClick).toHaveBeenCalledOnce();
  });

  it("should handle form inputs", async () => {
    const user = userEvent.setup();
    const mockSubmit = vi.fn();
    
    const TestForm = ({ onSubmit }: { onSubmit: (value: string) => void }) => {
      const [value, setValue] = React.useState("");
      
      const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(value);
      };
      
      return (
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            data-testid="test-input"
          />
          <button type="submit" data-testid="submit-button">Submit</button>
        </form>
      );
    };
    
    render(<TestForm onSubmit={mockSubmit} />);
    
    const input = screen.getByTestId("test-input");
    const submitButton = screen.getByTestId("submit-button");
    
    await user.type(input, "Hello World");
    expect(input).toHaveValue("Hello World");
    
    await user.click(submitButton);
    expect(mockSubmit).toHaveBeenCalledWith("Hello World");
  });
});