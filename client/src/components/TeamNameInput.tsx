import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, AlertCircle, Lightbulb, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface TeamNameInputProps {
  value: string;
  onChange: (value: string) => void;
  excludeTeamId?: string;
  showRules?: boolean;
  onValidationChange?: (isValid: boolean, sanitizedName?: string) => void;
}

interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedName?: string;
  suggestions?: string[];
  rules?: string[];
}

export function TeamNameInput({ 
  value, 
  onChange, 
  excludeTeamId, 
  showRules = true,
  onValidationChange 
}: TeamNameInputProps) {
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const queryClient = useQueryClient();

  // Get validation rules
  const { data: rulesData } = useQuery<any>({
    queryKey: ['/api/team-names/rules'],
    queryFn: () => apiRequest<any>('/api/team-names/rules')
  });

  // Validation mutation
  const validateMutation = useMutation({
    // @ts-expect-error TS2322
    mutationFn: (name: string) => 
      apiRequest('/api/team-names/validate-with-suggestions', 'POST', {
        baseName: name,
        excludeTeamId
      }),
    onSuccess: (data: ValidationResult) => {
      setValidationResult(data);
      setIsValidating(false);
      if (onValidationChange) {
        onValidationChange(data.isValid, data.sanitizedName);
      }
    },
    onError: () => {
      setIsValidating(false);
      setValidationResult({
        isValid: false,
        error: 'Validation failed. Please try again.'
      });
    }
  });

  // Quick availability check (debounced)
  useEffect(() => {
    if (!value || value.trim().length < 3) {
      setValidationResult(null);
      if (onValidationChange) onValidationChange(false);
      return;
    }

    const debounceTimer = setTimeout(() => {
      setIsValidating(true);
      validateMutation.mutate(value);
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [value, excludeTeamId]);

  const handleInputChange = (newValue: string) => {
    onChange(newValue);
    if (validationResult && !isValidating) {
      setValidationResult(null);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
  };

  const getValidationIcon = () => {
    if (isValidating) return <RefreshCw className="w-4 h-4 animate-spin text-gray-500" />;
    if (!validationResult) return null;
    if (validationResult.isValid) return <CheckCircle className="w-4 h-4 text-green-500" />;
    return <XCircle className="w-4 h-4 text-red-500" />;
  };

  const getValidationColor = () => {
    if (isValidating) return "border-gray-300";
    if (!validationResult) return "border-gray-300";
    if (validationResult.isValid) return "border-green-500";
    return "border-red-500";
  };

  return (
    <div className="space-y-4">
      {/* Input Field */}
      <div className="space-y-2">
        <Label htmlFor="team-name">Team Name</Label>
        <div className="relative">
          <Input
            id="team-name"
            type="text"
            value={value}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Enter your team name..."
            className={`pr-10 ${getValidationColor()}`}
            maxLength={20}
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {getValidationIcon()}
          </div>
        </div>
        
        {/* Character Counter */}
        <div className="flex justify-between text-xs text-gray-500">
          <span>
            {value.length}/20 characters
          </span>
          {value.length > 0 && (
            <span>
              {value.length < 3 ? 'Too short' : value.length > 20 ? 'Too long' : 'Good length'}
            </span>
          )}
        </div>
      </div>

      {/* Validation Message */}
      {validationResult && (
        <Alert className={validationResult.isValid ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          <div className="flex items-center gap-2">
            {validationResult.isValid ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600" />
            )}
            <AlertDescription className={validationResult.isValid ? "text-green-700" : "text-red-700"}>
              {validationResult.isValid 
                ? "Great! This team name is available." 
                : validationResult.error
              }
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Suggestions */}
      {validationResult && !validationResult.isValid && validationResult.suggestions && validationResult.suggestions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-500" />
              Name Suggestions
            </CardTitle>
            <CardDescription>
              Here are some available alternatives based on your input:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {validationResult.suggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="h-8 text-xs"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Rules */}
      {showRules && rulesData?.rules && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Team Name Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {rulesData.rules.map((rule: string, index: number) => (
                <li key={index} className="text-xs text-gray-600 flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Real-time Status */}
      {isValidating && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <RefreshCw className="w-3 h-3 animate-spin" />
          Checking availability...
        </div>
      )}
    </div>
  );
}