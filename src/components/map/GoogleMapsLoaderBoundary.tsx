import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type GoogleMapsLoaderBoundaryProps = {
  children: React.ReactNode;
};

type GoogleMapsLoaderBoundaryState = {
  error: Error | null;
};

export class GoogleMapsLoaderBoundary extends React.Component<
  GoogleMapsLoaderBoundaryProps,
  GoogleMapsLoaderBoundaryState
> {
  state: GoogleMapsLoaderBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): GoogleMapsLoaderBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error("Google Maps crashed:", error);

    // In dev, hot reload can keep the previous Loader singleton around.
    // If it was initialized with different options, the only safe recovery is a hard reload.
    if (error.message?.includes("Loader must not be called again with different options")) {
      const flag = "gmaps_loader_force_reload_v1";
      try {
        if (!sessionStorage.getItem(flag)) {
          sessionStorage.setItem(flag, "1");
          window.location.reload();
        }
      } catch {
        // ignore
      }
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    const isLoaderMismatch = this.state.error.message?.includes(
      "Loader must not be called again with different options"
    );

    return (
      <div className="w-full h-full flex items-center justify-center bg-secondary p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 space-y-3">
            <p className="font-semibold">Map failed to load</p>
            <p className="text-sm text-muted-foreground">
              {isLoaderMismatch
                ? "This can happen after a hot reload when the Google Maps script was initialized with different settings. Reload the page to reset it."
                : this.state.error.message || "Unexpected error while loading the map."}
            </p>
            <Button onClick={this.handleReload}>Reload page</Button>
          </CardContent>
        </Card>
      </div>
    );
  }
}
