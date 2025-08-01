import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { ExternalLink, Shield, Eye } from 'lucide-react';

export function AlphaTestingTerms() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="link" className="text-blue-400 hover:text-blue-300 p-0 h-auto text-sm">
          Alpha Testing Terms & NDA
          <ExternalLink className="h-3 w-3 ml-1" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Shield className="h-5 w-5 text-blue-400" />
            Realm Rivalry - Alpha Testing Agreement & NDA
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 text-gray-200 text-sm leading-relaxed">
            
            {/* Purpose Section */}
            <section className="space-y-3">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Eye className="h-4 w-4 text-blue-400" />
                1. Purpose & Alpha Testing Access
              </h3>
              <p>
                You are being granted exclusive access to Realm Rivalry's private Alpha test. This confidential 
                version is provided solely for testing, feedback, and evaluation purposes. Your participation 
                helps shape the final game experience.
              </p>
            </section>

            {/* Confidential Information */}
            <section className="space-y-3">
              <h3 className="text-lg font-semibold text-white">2. Confidential Information</h3>
              <p>All information you access is strictly confidential and includes:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-4">
                <div className="space-y-2">
                  <p><strong className="text-blue-300">Game Content:</strong> All gameplay mechanics, player races (Human, Sylvan, Gryll, Lumina, Umbra), stadium systems, and fantasy sports features</p>
                  <p><strong className="text-blue-300">Visual Assets:</strong> All artwork, UI designs, character models, and game environments</p>
                  <p><strong className="text-blue-300">Economic Systems:</strong> Credits, gems, item costs, reward structures, and monetization strategies</p>
                </div>
                <div className="space-y-2">
                  <p><strong className="text-blue-300">Technical Data:</strong> Performance metrics, algorithms, known bugs, and technical specifications</p>
                  <p><strong className="text-blue-300">Future Plans:</strong> Unreleased features, roadmap items, and development priorities</p>
                  <p><strong className="text-blue-300">Community:</strong> All private Discord discussions and internal communications</p>
                </div>
              </div>
            </section>

            {/* Strict Prohibitions */}
            <section className="space-y-3">
              <h3 className="text-lg font-semibold text-white text-red-300">3. Strict Prohibitions</h3>
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                <p className="font-medium text-red-300 mb-2">You explicitly agree NOT to:</p>
                <ul className="space-y-1 ml-4 text-red-200">
                  <li>• Record, stream, or broadcast any gameplay footage</li>
                  <li>• Take or distribute screenshots of any game content</li>
                  <li>• Discuss the game on social media (Reddit, Twitter, TikTok, etc.)</li>
                  <li>• Share information with anyone not under a similar NDA</li>
                  <li>• Attempt to reverse-engineer or decompile the game</li>
                  <li>• Post about the game outside official private channels</li>
                </ul>
              </div>
            </section>

            {/* Data & Progress Reset */}
            <section className="space-y-3">
              <h3 className="text-lg font-semibold text-white text-yellow-300">4. Alpha Testing Notice</h3>
              <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                <p className="text-yellow-200">
                  <strong>Important:</strong> This is an Alpha test. Your team data, progress, and statistics 
                  may be reset at any time during development. Features may change significantly before 
                  the public release.
                </p>
              </div>
            </section>

            {/* Feedback & Communication */}
            <section className="space-y-3">
              <h3 className="text-lg font-semibold text-white">5. Feedback & Communication</h3>
              <p>
                Your feedback is invaluable. Please share thoughts, bug reports, and suggestions through 
                our private Discord server. All feedback becomes part of our confidential development process.
              </p>
            </section>

            {/* Legal Terms */}
            <section className="space-y-3">
              <h3 className="text-lg font-semibold text-white">6. Legal Terms</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Duration:</strong> These confidentiality obligations remain in effect for 5 years or until public release, whichever is later.</p>
                <p><strong>No License:</strong> This agreement grants no rights to our intellectual property.</p>
                <p><strong>Remedies:</strong> Breach of this agreement may result in immediate termination of access and legal action for damages.</p>
                <p><strong>Governing Law:</strong> This agreement is governed by applicable laws and any disputes will be resolved through binding arbitration.</p>
              </div>
            </section>

            {/* Acknowledgment */}
            <section className="space-y-3">
              <h3 className="text-lg font-semibold text-white">7. Acknowledgment</h3>
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                <p className="text-blue-200">
                  By creating your dynasty and accessing Realm Rivalry's Alpha test, you acknowledge 
                  that you have read, understood, and agree to be legally bound by all terms of this 
                  Confidentiality & Non-Disclosure Agreement.
                </p>
              </div>
            </section>

            <div className="border-t border-gray-700 pt-4 mt-6">
              <p className="text-xs text-gray-400 text-center">
                Last Updated: August 1, 2025 • Realm Rivalry Alpha Testing Program
              </p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// Compact checkbox version for forms
export function AlphaTestingCheckbox({ checked, onCheckedChange }: { 
  checked: boolean; 
  onCheckedChange: (checked: boolean) => void; 
}) {
  return (
    <div className="flex items-start space-x-3 p-4 bg-blue-900/10 border border-blue-500/20 rounded-lg">
      <input
        type="checkbox"
        id="alpha-terms"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
      />
      <label htmlFor="alpha-terms" className="text-sm text-gray-200 leading-relaxed">
        I agree to the confidentiality terms and understand this is a private Alpha test. 
        I will not share, record, or discuss game content publicly and acknowledge that 
        progress may be reset during development. {' '}
        <AlphaTestingTerms />
      </label>
    </div>
  );
}