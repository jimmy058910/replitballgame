import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function EmbeddedHelpManual() {
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
          <h1 key={index} className="text-2xl font-bold mb-4 mt-6">
            {line.substring(2)}
          </h1>
        );
      } else if (line.startsWith("## ")) {
        const id = line.substring(3).toLowerCase().replace(/\s+/g, "-");
        elements.push(
          <h2 key={index} id={id} className="text-xl font-bold mb-3 mt-5 text-blue-400">
            {line.substring(3)}
          </h2>
        );
      } else if (line.startsWith("### ")) {
        const id = line.substring(4).toLowerCase().replace(/\s+/g, "-");
        elements.push(
          <h3 key={index} id={id} className="text-lg font-bold mb-2 mt-4">
            {line.substring(4)}
          </h3>
        );
      } else if (line.startsWith("#### ")) {
        elements.push(
          <h4 key={index} className="text-base font-semibold mb-2 mt-3 text-gray-300">
            {line.substring(5)}
          </h4>
        );
      }
      // Lists
      else if (line.match(/^[-*]\s/)) {
        elements.push(
          <li key={index} className="ml-6 mb-1 list-disc text-sm">
            {line.substring(2)}
          </li>
        );
      } else if (line.match(/^\d+\.\s/)) {
        elements.push(
          <li key={index} className="ml-6 mb-1 list-decimal text-sm">
            {line.substring(line.indexOf(". ") + 2)}
          </li>
        );
      }
      // Bold text
      else if (line.includes("**")) {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        elements.push(
          <p key={index} className="mb-2 text-sm">
            {parts.map((part, i) => 
              i % 2 === 1 ? <strong key={i}>{part}</strong> : part
            )}
          </p>
        );
      }
      // Regular paragraphs
      else if (line.trim()) {
        elements.push(
          <p key={index} className="mb-2 text-gray-300 text-sm">
            {line}
          </p>
        );
      }
      // Empty lines
      else {
        elements.push(<div key={index} className="h-1" />);
      }
    });

    return elements;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
      {/* Table of Contents */}
      <div className="lg:col-span-1">
        <Card className="bg-gray-700 border-gray-600 h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Table of Contents</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
              <Input
                type="text"
                placeholder="Search sections..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-7 text-xs h-8"
              />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="h-[480px]">
              <div className="space-y-1">
                {filteredSections.map((section) => (
                  <Button
                    key={section.id}
                    variant="ghost"
                    size="sm"
                    className={`w-full justify-start text-left text-xs h-auto py-1 px-2 ${
                      activeSection === section.id ? "bg-gray-600" : ""
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
        <Card className="bg-gray-700 border-gray-600 h-full">
          <CardContent className="p-4">
            <ScrollArea className="h-[560px] pr-4">
              {renderManualContent()}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}