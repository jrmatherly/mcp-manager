"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, RefreshCw, CheckCircle, XCircle } from "lucide-react";

interface AzureClaimsData {
  message: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  microsoftAccount: {
    accountId: string;
    providerId: string;
    scope: string;
    tokenType: string;
    hasIdToken: boolean;
    hasAccessToken: boolean;
    hasRefreshToken: boolean;
    accessTokenExpiresAt: string;
    refreshTokenExpiresAt: string;
  };
  claims: {
    idToken: Record<string, unknown>;
    accessToken: Record<string, unknown>;
  };
  roleMapping: {
    detectedRoles: {
      fromIdToken: string[];
      fromAccessToken: string[];
    };
    explanation: string;
    instructions: string[];
  };
}

export default function AzureRolesDebugPage() {
  const [data, setData] = useState<AzureClaimsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAzureClaims = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/debug/azure-claims");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch Azure claims");
      }

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Azure AD Role Mapping Debug</h1>
          <p className="text-muted-foreground">Debug Azure AD token claims and role mapping for Microsoft SSO authentication</p>
        </div>
        <Button onClick={fetchAzureClaims} disabled={loading}>
          {loading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Fetch Claims
            </>
          )}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {data && (
        <div className="space-y-6">
          {/* User Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Current User Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Name:</strong> {data.user.name}
                </div>
                <div>
                  <strong>Email:</strong> {data.user.email}
                </div>
                <div>
                  <strong>User ID:</strong> {data.user.id}
                </div>
                <div className="flex items-center gap-2">
                  <strong>Current Role:</strong>
                  <Badge variant={data.user.role === "admin" ? "default" : "secondary"}>{data.user.role}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Microsoft Account Info */}
          <Card>
            <CardHeader>
              <CardTitle>Microsoft Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Account ID:</strong> {data.microsoftAccount.accountId}
                </div>
                <div>
                  <strong>Provider:</strong> {data.microsoftAccount.providerId}
                </div>
                <div>
                  <strong>Scope:</strong> {data.microsoftAccount.scope}
                </div>
                <div>
                  <strong>Token Type:</strong> {data.microsoftAccount.tokenType}
                </div>
                <div className="flex items-center gap-2">
                  <strong>Has ID Token:</strong>
                  {data.microsoftAccount.hasIdToken ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <strong>Has Access Token:</strong>
                  {data.microsoftAccount.hasAccessToken ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Role Detection */}
          <Card>
            <CardHeader>
              <CardTitle>Detected Azure AD Roles</CardTitle>
              <CardDescription>{data.roleMapping.explanation}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <strong>Roles from ID Token:</strong>
                <div className="mt-2">
                  {data.roleMapping.detectedRoles.fromIdToken.length > 0 ? (
                    <div className="flex gap-2 flex-wrap">
                      {data.roleMapping.detectedRoles.fromIdToken.map((role, index) => (
                        <Badge key={index} variant="outline">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic">No roles found in ID token</p>
                  )}
                </div>
              </div>

              <div>
                <strong>Roles from Access Token:</strong>
                <div className="mt-2">
                  {data.roleMapping.detectedRoles.fromAccessToken.length > 0 ? (
                    <div className="flex gap-2 flex-wrap">
                      {data.roleMapping.detectedRoles.fromAccessToken.map((role, index) => (
                        <Badge key={index} variant="outline">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic">No roles found in access token</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Setup Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Azure AD Setup Instructions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2">
                {data.roleMapping.instructions.map((instruction, index) => (
                  <li key={index}>{instruction}</li>
                ))}
              </ol>
            </CardContent>
          </Card>

          {/* Raw Token Claims */}
          <Card>
            <CardHeader>
              <CardTitle>Raw Token Claims</CardTitle>
              <CardDescription>Raw JWT token payload data for debugging</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <strong>ID Token Claims:</strong>
                <pre className="mt-2 p-4 bg-muted rounded-md text-sm overflow-auto">{JSON.stringify(data.claims.idToken, null, 2)}</pre>
              </div>

              <Separator />

              <div>
                <strong>Access Token Claims:</strong>
                <pre className="mt-2 p-4 bg-muted rounded-md text-sm overflow-auto">{JSON.stringify(data.claims.accessToken, null, 2)}</pre>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!data && !loading && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Click &quot;Fetch Claims&quot; to analyze your Azure AD authentication tokens and see role mapping information.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
