import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import ClientHome from "./pages/ClientHome";
import ClientMessages from "./pages/ClientMessages";
import ClientInstitution from "./pages/ClientInstitution";
import ClientProfile from "./pages/ClientProfile";
import ClientApplication from "./pages/ClientApplication";
import ClientPrivacy from "./pages/ClientPrivacy";
import ClientSessionUnavailable from "./pages/ClientSessionUnavailable";
import ClientDemo from "./pages/ClientDemo";
import ClientDemoChat from "./pages/ClientDemoChat";
import GuestChat from "./pages/GuestChat";
import InviteGuest from "./pages/InviteGuest";
import MissedCallPreview from "./pages/MissedCallPreview";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Dashboard} />
      <Route path={"/client/access-unavailable"} component={ClientSessionUnavailable} />
      <Route path={"/client/:publicId/messages"} component={ClientMessages} />
      <Route path={"/client/:publicId/chat"} component={GuestChat} />
      <Route path={"/client/:publicId/institution"} component={ClientInstitution} />
      <Route path={"/client/:publicId/profile"} component={ClientProfile} />
      <Route path={"/client/:publicId/application"} component={ClientApplication} />
      <Route path={"/chat/:publicId"} component={GuestChat} />
      <Route path={"/client/:publicId"} component={ClientHome} />
      <Route path={"/client/:publicId/privacy"} component={ClientPrivacy} />
      <Route path={"/client-demo"} component={ClientDemo} />
      <Route path={"/client-demo/chat"} component={ClientDemoChat} />
      <Route path={"/invite/:code"} component={InviteGuest} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/dashboard/contacts"} component={Dashboard} />
      <Route path={"/dashboard/customer-ui"} component={Dashboard} />
      <Route path={"/dashboard/requests"} component={Dashboard} />
      <Route path={"/dashboard/chats/:conversationId"} component={Dashboard} />
      <Route path={"/dashboard/chats"} component={Dashboard} />
      <Route path={"/dashboard/invitations"} component={Dashboard} />
      <Route path={"/dashboard/calls"} component={Dashboard} />
      <Route path={"/dashboard/statuses"} component={Dashboard} />
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
