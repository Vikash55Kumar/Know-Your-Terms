/**
 * Standardized Component Mapping - OPTIMIZED
 * Only includes components actually used in the chat application
 * Uses relative imports for maximum frontend-term compatibility
 */

// ===== CORE UI COMPONENTS (USED) =====
export { Button } from "../components/ui/button";
export { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter 
} from "../components/ui/card";
export { Badge } from "../components/ui/badge";
export { Input } from "../components/ui/input";
export { Textarea } from "../components/ui/textarea";
export { Label } from "../components/ui/label";
export { 
  Avatar, 
  AvatarImage, 
  AvatarFallback 
} from "../components/ui/avatar";

// ===== CUSTOM COMPONENTS =====
export { HomePage } from "../components/home-page";

// ===== TOAST (REACT-TOASTIFY) =====
export { toast } from "react-toastify";
export { ToastContainer } from "react-toastify";

export { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../components/ui/alert-dialog";
export { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
export { ScrollArea } from "../components/ui/scroll-area";
export { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

// ===== STREAM CHAT COMPONENTS =====
export { 
  Chat, 
  Channel, 
  ChannelHeader, 
  MessageList,
  MessageInput, 
  Window,
  useCreateChatClient,
  useChannelStateContext,
  useChannelActionContext,
  useChatContext,
  useAIState,
  useMessageContext,
  useMessageTextStreaming,
  ChannelList,
  MessageInputFlat
} from "stream-chat-react";

// ===== STREAM CHAT TYPES =====
export type { 
  Channel as ChannelType, 
  ChannelFilters, 
  ChannelSort,
  MessageResponse
} from "stream-chat";

// ===== ICONS (LUCIDE REACT) =====
export { 
  Bot, 
  BotOff, 
  Loader2, 
  RefreshCw, 
  Send,
  User as UserIcon,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  Plus,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  MessageSquare,
  Briefcase,
  Lightbulb,
  Sparkles,
  ArrowRight,
  Square,
  Check,
  CheckCircle,
  Copy,
  MessageCircle,
  Moon,
  Sun,
  PlusCircle,
  Hash,
  Trash2,
  List,
  Minimize2,
  Palette,
  PenLine,
  Smile,
  SpellCheck,
  Type
} from "lucide-react";

// ===== UTILITIES =====
export { cn } from "../lib/utils";

// ===== TYPES =====
export type { User } from "stream-chat";
