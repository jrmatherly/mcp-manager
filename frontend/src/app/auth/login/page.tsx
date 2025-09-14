"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import LoginForm from "@/components/auth/login-form";
import { Card, CardContent } from "@/components/ui/card";
import { GoogleIcon, GithubIcon, MicrosoftIcon } from "@/components/ui/icons";
import { signInWithGithub, signInWithGoogle, signInWithMicrosoft } from "@/lib/auth-client";
import { GalleryVerticalEnd } from "lucide-react";

const LoginPage = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100">
      <div className="flex flex-col items-center w-full max-w-md gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GalleryVerticalEnd className="size-4" />
          </div>
          MCP Manager
        </a>
        <Card className="w-full">
          <CardContent className="flex flex-col gap-4 pt-6">
            <LoginForm />
            <div className="flex items-center my-2">
              <div className="flex-1 h-px bg-muted-foreground/30" />
              <span className="mx-3 text-muted-foreground text-xs font-medium">OR</span>
              <div className="flex-1 h-px bg-muted-foreground/30" />
            </div>
            <div className="flex flex-col gap-2 w-full">
              <div className="flex flex-row gap-2 w-full">
                <Button
                  variant="outline"
                  className="w-1/2 flex items-center justify-center cursor-pointer"
                  type="button"
                  onClick={signInWithGoogle}
                >
                  <GoogleIcon className="mr-2" />
                  Google
                </Button>
                <Button
                  variant="outline"
                  className="w-1/2 flex items-center justify-center cursor-pointer"
                  type="button"
                  onClick={signInWithGithub}
                >
                  <GithubIcon className="mr-2" />
                  GitHub
                </Button>
              </div>
              <Button
                variant="outline"
                className="w-full flex items-center justify-center cursor-pointer"
                type="button"
                onClick={signInWithMicrosoft}
              >
                <MicrosoftIcon className="mr-2" />
                Microsoft
              </Button>
            </div>
            <div className="text-center text-sm mt-4">
              Not registered?{" "}
              <Link href="/auth/register" className="text-primary underline hover:no-underline font-medium">
                Create an account
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
