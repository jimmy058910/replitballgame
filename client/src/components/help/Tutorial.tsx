import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { X } from "lucide-react";

interface TutorialStep {
  id: string;
  title: string;
  content: string;
  target: string | null;
}

interface TutorialProps {
  show: boolean;
  currentStep: number;
  steps: TutorialStep[];
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
}

export function Tutorial({ show, currentStep, steps, onNext, onPrevious, onSkip }: TutorialProps) {
  const [highlightElement, setHighlightElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!show) {
      setHighlightElement(null);
      return;
    }

    const step = steps[currentStep];
    if (step.target) {
      const element = document.querySelector(step.target) as HTMLElement;
      if (element) {
        setHighlightElement(element);
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } else {
      setHighlightElement(null);
    }
  }, [show, currentStep, steps]);

  if (!show) return null;

  const progress = ((currentStep + 1) / steps.length) * 100;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
      
      {/* Highlight box */}
      {highlightElement && (
        <div
          className="fixed border-2 border-primary rounded-lg z-40 pointer-events-none animate-pulse"
          style={{
            top: highlightElement.offsetTop - 4,
            left: highlightElement.offsetLeft - 4,
            width: highlightElement.offsetWidth + 8,
            height: highlightElement.offsetHeight + 8,
          }}
        />
      )}

      {/* Tutorial Card */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md">
        <Card className="shadow-xl">
          <CardHeader className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2"
              onClick={onSkip}
            >
              <X className="h-4 w-4" />
            </Button>
            <CardTitle>{steps[currentStep].title}</CardTitle>
            <CardDescription>Step {currentStep + 1} of {steps.length}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-4">{steps[currentStep].content}</p>
            <Progress value={progress} className="h-2" />
          </CardContent>
          <CardFooter className="justify-between">
            <Button
              variant="outline"
              onClick={onPrevious}
              disabled={currentStep === 0}
            >
              Previous
            </Button>
            <Button onClick={onNext}>
              {isLastStep ? "Finish" : "Next"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}