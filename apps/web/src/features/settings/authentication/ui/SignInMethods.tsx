"use client";

import { Fragment } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemSeparator,
  ItemTitle,
} from "@/shared/components/ui/item";
import type { AuthenticationFlash, SignInMethod } from "../model/sign-in-methods.types";
import { useSignInMethods } from "../model/use-sign-in-methods";
import { isOAuthProvider } from "../model/sign-in-methods.lib";

type SignInMethodsProps = {
  initialMethods: SignInMethod[];
} & AuthenticationFlash;

export function SignInMethods(props: SignInMethodsProps) {
  const state = useSignInMethods(props.initialMethods, {
    flashError: props.flashError,
    flashSuccess: props.flashSuccess,
  });

  return (
    <div className="mt-3 grid gap-3">
      {state.methodRows.map((method, index) => {
        return (
          <Fragment key={method.provider}>
            <Item variant="outline">
              <ItemContent>
                <ItemTitle>{method.label}</ItemTitle>
                <ItemDescription>{method.statusText}</ItemDescription>
                {method.linkedIdentifier ? (
                  <ItemDescription>{method.linkedIdentifier}</ItemDescription>
                ) : null}
                {method.lastUsedText ? (
                  <ItemDescription>Last used {method.lastUsedText}</ItemDescription>
                ) : null}
              </ItemContent>

              <ItemActions className="ms-auto">
                {method.canConnect ? (
                  <Button
                    type="button"
                    onClick={() => {
                      const provider = method.provider;
                      if (!isOAuthProvider(provider)) return;
                      state.startConnect(provider);
                    }}
                    disabled={method.isBusy}
                  >
                    {method.isBusy ? "Connecting..." : "Connect"}
                  </Button>
                ) : null}

                {method.canManage ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => state.setShowSetPassword((value) => !value)}
                    disabled={method.isBusy}
                  >
                    Manage
                  </Button>
                ) : null}

                {method.canDisconnect ? (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => state.setDisconnectTarget(method)}
                    disabled={method.isBusy || !method.canDisconnect}
                  >
                    Disconnect
                  </Button>
                ) : null}
              </ItemActions>
            </Item>
            {index < state.methodRows.length - 1 ? <ItemSeparator /> : null}
          </Fragment>
        );
      })}

      {state.emailMethod && !state.emailMethod.connected && state.showSetPassword ? (
        <div className="rounded-md border p-3">
          <p className="mb-2 text-sm font-medium">Set password</p>
          <div className="grid max-w-[420px] gap-2">
            <Input
              type="password"
              placeholder="New password"
              value={state.password}
              onChange={(event) => state.setPassword(event.target.value)}
              autoComplete="new-password"
            />
            <Input
              type="password"
              placeholder="Confirm password"
              value={state.confirmPassword}
              onChange={(event) => state.setConfirmPassword(event.target.value)}
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">
              Minimum 8 characters. Common weak passwords are blocked.
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => {
                  void state.submitSetPassword();
                }}
                disabled={state.busyProvider === "email"}
              >
                {state.busyProvider === "email" ? "Saving..." : "Set password"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => state.setShowSetPassword(false)}
                disabled={state.busyProvider === "email"}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {state.message ? <p className="text-sm text-muted-foreground">{state.message}</p> : null}

      <AlertDialog
        open={Boolean(state.disconnectTarget)}
        onOpenChange={(open) => !open && state.setDisconnectTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Disconnect {state.disconnectTarget?.label}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Disconnect {state.disconnectTarget?.label}? You may lose access if it&apos;s your only sign-in method.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (state.disconnectTarget && isOAuthProvider(state.disconnectTarget.provider)) {
                  void state.submitDisconnect(state.disconnectTarget.provider);
                }
              }}
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
