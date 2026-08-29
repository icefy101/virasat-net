// Archive of Trust: one route map, one authenticated shell, and direct escape routes from every detail view.
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Redirect, Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AppShell } from "./components/AppShell";
import Dashboard from "./pages/Dashboard";
import RegulatorDetail from "./pages/RegulatorDetail";
import Claims from "./pages/Claims";
import ClaimAssist from "./pages/ClaimAssist";
import FinTwin from "./pages/FinTwin";
import { Auth, Documents, Onboarding, Profile } from "./pages/SupportingPages";
import NotFound from "./pages/NotFound";

function AppRoutes() {
  return <Switch>
    <Route path="/"><Redirect to="/home" /></Route>
    <Route path="/login"><Auth /></Route>
    <Route path="/signup"><Auth signup /></Route>
    <Route path="/onboarding"><Onboarding /></Route>
    <Route path="/claims/:claimId/assist"><AppShell><ClaimAssist /></AppShell></Route>
    <Route path="/claims/:claimId"><AppShell><ClaimAssist /></AppShell></Route>
    <Route path="/regulator/:regulatorId"><AppShell><RegulatorDetail /></AppShell></Route>
    <Route path="/claims"><AppShell><Claims /></AppShell></Route>
    <Route path="/fintwin"><AppShell><FinTwin /></AppShell></Route>
    <Route path="/documents"><AppShell><Documents /></AppShell></Route>
    <Route path="/profile"><AppShell><Profile /></AppShell></Route>
    <Route path="/home"><AppShell><Dashboard /></AppShell></Route>
    <Route><NotFound /></Route>
  </Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster position="bottom-right" /><AppRoutes /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
