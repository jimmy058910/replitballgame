import { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, BookOpen, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function HelpManual() {
  const [manualContent, setManualContent] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    // Load the manual content
    fetch("/api/help/manual")
      .then(response => response.text())
      .then(text => setManualContent(text))
      .catch(error => console.error("Error loading manual:", error));
  }, []);

  // Parse sections from markdown
  const sections = manualContent.match(/^### .+$/gm)?.map(section => {
    const id = section.replace(/^### /, "").toLowerCase().replace(/\s+/g, "-");
    const title = section.replace(/^### /, "");
    return { id, title };
  }) || [];

  // Filter sections based on search
  const filteredSections = sections.filter(section =>
    section.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSection(sectionId);
    }
  };

  // Convert markdown to HTML-like structure
  const renderManualContent = () => {
    if (!manualContent) {
      return <div className="text-center py-8 text-gray-400">Loading manual...</div>;
    }

    const lines = manualContent.split("\n");
    const elements: JSX.Element[] = [];
    let currentList: string[] = [];
    let inCodeBlock = false;

    lines.forEach((line, index) => {
      // Code blocks
      if (line.startsWith("```")) {
        inCodeBlock = !inCodeBlock;
        if (!inCodeBlock && currentList.length > 0) {
          elements.push(
            <pre key={`code-${index}`} className="bg-gray-800 p-4 rounded-lg overflow-x-auto my-4">
              <code>{currentList.join("\n")}</code>
            </pre>
          );
          currentList = [];
        }
        return;
      }

      if (inCodeBlock) {
        currentList.push(line);
        return;
      }

      // Headers
      if (line.startsWith("# ")) {
        elements.push(
          <h1 key={index} className="text-4xl font-bold mb-6 mt-8">
            {line.substring(2)}
          </h1>
        );
      } else if (line.startsWith("## ")) {
        const id = line.substring(3).toLowerCase().replace(/\s+/g, "-");
        elements.push(
          <h2 key={index} id={id} className="text-3xl font-bold mb-4 mt-6 text-primary">
            {line.substring(3)}
          </h2>
        );
      } else if (line.startsWith("### ")) {
        const id = line.substring(4).toLowerCase().replace(/\s+/g, "-");
        elements.push(
          <h3 key={index} id={id} className="text-2xl font-bold mb-3 mt-4">
            {line.substring(4)}
          </h3>
        );
      } else if (line.startsWith("#### ")) {
        elements.push(
          <h4 key={index} className="text-xl font-semibold mb-2 mt-3 text-gray-300">
            {line.substring(5)}
          </h4>
        );
      }
      // Lists
      else if (line.match(/^[-*]\s/)) {
        elements.push(
          <li key={index} className="ml-6 mb-1 list-disc">
            {line.substring(2)}
          </li>
        );
      } else if (line.match(/^\d+\.\s/)) {
        elements.push(
          <li key={index} className="ml-6 mb-1 list-decimal">
            {line.substring(line.indexOf(". ") + 2)}
          </li>
        );
      }
      // Bold text
      else if (line.includes("**")) {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        elements.push(
          <p key={index} className="mb-2">
            {parts.map((part, i) => 
              i % 2 === 1 ? <strong key={i}>{part}</strong> : part
            )}
          </p>
        );
      }
      // Regular paragraphs
      else if (line.trim()) {
        elements.push(
          <p key={index} className="mb-2 text-gray-300">
            {line}
          </p>
        );
      }
      // Empty lines
      else {
        elements.push(<div key={index} className="h-2" />);
      }
    });

    return elements;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.history.back()}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <h1 className="font-orbitron text-3xl font-bold flex items-center gap-3">
                <BookOpen className="h-8 w-8 text-primary" />
                Game Manual
              </h1>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Table of Contents */}
          <div className="lg:col-span-1">
            <Card className="bg-gray-800 border-gray-700 sticky top-4">
              <CardHeader>
                <CardTitle className="text-lg">Table of Contents</CardTitle>
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search sections..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-1">
                    {filteredSections.map((section) => (
                      <Button
                        key={section.id}
                        variant="ghost"
                        size="sm"
                        className={`w-full justify-start text-left text-sm ${
                          activeSection === section.id ? "bg-gray-700" : ""
                        }`}
                        onClick={() => scrollToSection(section.id)}
                      >
                        {section.title}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Manual Content */}
          <div className="lg:col-span-3">
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-8">
                <ScrollArea className="h-[800px] pr-4">
                  {renderManualContent()}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}