import { useContextualHelp } from "@/hooks/useContextualHelp";
import { Tutorial } from "./Tutorial";
import { Button } from "@/components/ui/button";
import { HelpCircle, BookOpen, RotateCcw } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function ContextualHelp() {
  const {
    showTutorial,
    currentStep,
    tutorialSteps,
    hasSeenTutorial,
    nextStep,
    previousStep,
    skipTutorial,
    resetTutorial,
  } = useContextualHelp();

  return (
    <>
      {/* Tutorial Overlay */}
      <Tutorial
        show={showTutorial}
        currentStep={currentStep}
        steps={tutorialSteps}
        onNext={nextStep}
        onPrevious={previousStep}
        onSkip={skipTutorial}
      />

      {/* Help Menu Button */}
      <div className="fixed bottom-4 right-4 z-30">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full shadow-lg"
            >
              <HelpCircle className="h-6 w-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={() => window.location.href = "/help"}
            >
              <BookOpen className="mr-2 h-4 w-4" />
              Game Manual
            </DropdownMenuItem>
            {hasSeenTutorial && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={resetTutorial}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restart Tutorial
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}