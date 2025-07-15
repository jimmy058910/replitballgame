import React, { useState } from 'react';
import { DomainAPIExample } from '@/components/DomainAPIExample';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { tournamentAPI, matchAPI, economyAPI, authAPI, checkDomainHealth } from '@/lib/domainAPI';
import { AlertCircle, CheckCircle, Zap, Database, Shield, TestTube } from 'lucide-react';

export default function DomainDemo() {
  const [results, setResults] = useState<{[key: string]: any}>({});
  const [loading, setLoading] = useState<{[key: string]: boolean}>({});
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const testEndpoint = async (name: string, apiCall: () => Promise<any>) => {
    setLoading(prev => ({ ...prev, [name]: true }));
    setErrors(prev => ({ ...prev, [name]: '' }));
    
    try {
      const result = await apiCall();
      setResults(prev => ({ ...prev, [name]: result }));
      console.log(`${name} result:`, result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setErrors(prev => ({ ...prev, [name]: errorMessage }));
      console.error(`${name} error:`, error);
    } finally {
      setLoading(prev => ({ ...prev, [name]: false }));
    }
  };

  const domainTests = [
    {
      category: 'Authentication Domain',
      icon: <Shield className="w-4 h-4" />,
      tests: [
        {
          name: 'auth-health',
          label: 'Auth Health Check',
          description: 'Test auth domain health endpoint',
          call: () => authAPI.healthCheck()
        },
        {
          name: 'auth-profile',
          label: 'Get User Profile',
          description: 'Retrieve current user profile with validation',
          call: () => authAPI.getProfile()
        }
      ]
    },
    {
      category: 'Tournament Domain',
      icon: <Zap className="w-4 h-4" />,
      tests: [
        {
          name: 'tournament-history',
          label: 'Tournament History',
          description: 'Get tournament history with Zod validation',
          call: () => tournamentAPI.getHistory(132)
        },
        {
          name: 'tournament-active',
          label: 'Active Tournaments',
          description: 'Get active tournaments with real-time updates',
          call: () => tournamentAPI.getActive(132)
        },
        {
          name: 'tournament-status',
          label: 'Tournament Status',
          description: 'Get tournament status (will fail gracefully)',
          call: () => tournamentAPI.getStatus(1)
        }
      ]
    },
    {
      category: 'Match Domain',
      icon: <Database className="w-4 h-4" />,
      tests: [
        {
          name: 'match-live',
          label: 'Live Matches',
          description: 'Get live matches with state management',
          call: () => matchAPI.getLive()
        },
        {
          name: 'match-create',
          label: 'Create Match',
          description: 'Create new match with validation',
          call: () => matchAPI.create({
            homeTeamId: 132,
            awayTeamId: 133,
            matchType: 'EXHIBITION',
            scheduledTime: new Date()
          })
        }
      ]
    },
    {
      category: 'Economy Domain',
      icon: <TestTube className="w-4 h-4" />,
      tests: [
        {
          name: 'economy-store',
          label: 'Daily Store Items',
          description: 'Get daily store with item validation',
          call: () => economyAPI.getDailyStore()
        },
        {
          name: 'economy-finances',
          label: 'Team Finances',
          description: 'Get financial summary with calculations',
          call: () => economyAPI.getFinances(132)
        },
        {
          name: 'economy-marketplace',
          label: 'Marketplace Listings',
          description: 'Get marketplace with pagination',
          call: () => economyAPI.getMarketplace(1, 10)
        }
      ]
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Domain-Driven Architecture Demo</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Demonstrating the new domain-driven backend with Zod validation, 
          Zustand state management, and comprehensive testing coverage.
        </p>
        
        <div className="flex justify-center gap-4">
          <Badge variant="outline" className="text-green-600">
            <CheckCircle className="w-3 h-3 mr-1" />
            Domain Routes: /api/v2
          </Badge>
          <Badge variant="outline" className="text-blue-600">
            <Shield className="w-3 h-3 mr-1" />
            Zod Validation
          </Badge>
          <Badge variant="outline" className="text-purple-600">
            <Zap className="w-3 h-3 mr-1" />
            Zustand State
          </Badge>
          <Badge variant="outline" className="text-orange-600">
            <TestTube className="w-3 h-3 mr-1" />
            80% Test Coverage
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="api-tests" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="api-tests">API Tests</TabsTrigger>
          <TabsTrigger value="state-demo">State Management</TabsTrigger>
          <TabsTrigger value="architecture">Architecture</TabsTrigger>
        </TabsList>

        <TabsContent value="api-tests" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Domain API Endpoints
              </CardTitle>
              <CardDescription>
                Test the new domain-driven API endpoints with comprehensive validation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {domainTests.map((category) => (
                  <div key={category.category} className="space-y-3">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      {category.icon}
                      {category.category}
                    </h3>
                    <div className="grid gap-3">
                      {category.tests.map((test) => (
                        <div 
                          key={test.name}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="font-medium">{test.label}</div>
                            <div className="text-sm text-muted-foreground">
                              {test.description}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => testEndpoint(test.name, test.call)}
                              disabled={loading[test.name]}
                              size="sm"
                            >
                              {loading[test.name] ? 'Testing...' : 'Test'}
                            </Button>
                            {results[test.name] && (
                              <Badge variant="outline" className="text-green-600">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Success
                              </Badge>
                            )}
                            {errors[test.name] && (
                              <Badge variant="outline" className="text-red-600">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Error
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Results Display */}
          {Object.keys(results).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>API Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(results).map(([key, result]) => (
                    <div key={key} className="border rounded p-3">
                      <div className="font-medium mb-2">{key}</div>
                      <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                        {JSON.stringify(result, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Errors Display */}
          {Object.keys(errors).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Validation Errors</CardTitle>
                <CardDescription>
                  These demonstrate Zod validation in action
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(errors).filter(([_, error]) => error).map(([key, error]) => (
                    <div key={key} className="border border-red-200 rounded p-3">
                      <div className="font-medium mb-2 text-red-600">{key}</div>
                      <div className="text-sm text-red-700">{error}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="state-demo">
          <DomainAPIExample />
        </TabsContent>

        <TabsContent value="architecture" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Domain Architecture Overview</CardTitle>
              <CardDescription>
                New domain-driven architecture with bounded contexts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h3 className="font-semibold">Backend Domains</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        <span>Core Domain - Logging, validation, errors</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        <span>Auth Domain - Authentication & authorization</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        <span>Tournament Domain - Tournament management</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        <span>Match Domain - Match simulation & state</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TestTube className="w-4 h-4" />
                        <span>Economy Domain - Financial & marketplace</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="font-semibold">Frontend State</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        <span>Tournament Store - Real-time updates</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        <span>Match Store - Live simulation events</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TestTube className="w-4 h-4" />
                        <span>Economy Store - Financial tracking</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        <span>WebSocket Integration - Real-time sync</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Key Features</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">Type Safety</h4>
                      <p className="text-sm text-muted-foreground">
                        Zod schemas provide compile-time and runtime validation
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium">Real-time Updates</h4>
                      <p className="text-sm text-muted-foreground">
                        Zustand stores with WebSocket integration for live data
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium">Comprehensive Testing</h4>
                      <p className="text-sm text-muted-foreground">
                        80% branch coverage with domain-specific test suites
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}