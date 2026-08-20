import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import GuestChat from "./pages/GuestChat";
import InviteGuest from "./pages/InviteGuest";
import MissedCallPreview from "./pages/MissedCallPreview";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Dashboard} />
      <Route path={"/chat/:publicId"} component={GuestChat} />
      <Route path={"/invite/:code"} component={InviteGuest} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/dashboard/contacts"} component={Dashboard} />
      <Route path={"/dashboard/requests"} component={Dashboard} />
      <Route path={"/dashboard/chats"} component={Dashboard} />
      <Route path={"/dashboard/invitations"} component={Dashboard} />
      <Route path={"/dashboard/calls"} component={Dashboard} />
      <Route path={"/dashboard/app-agent"} component={Dashboard} />
      <Route path={"/dashboard/voice-ai"} component={Dashboard} />
      <Route path={"/dashboard/voice-models"} component={Dashboard} />
      <Route path={"/dashboard/settings"} component={Dashboard} />
      <Route path={"/dashboard/archive"} component={Dashboard} />
      {import.meta.env.DEV && <Route path={"/_qa/missed-calls"} component={MissedCallPreview} />}
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
