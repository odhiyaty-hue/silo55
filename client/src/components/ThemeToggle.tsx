import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      title={theme === "light" ? "تفعيل الوضع الليلي" : "تفعيل الوضع النهاري"}
      className="rounded-full w-10 h-10 transition-all duration-300 hover:bg-accent hover:text-accent-foreground"
    >
      {theme === "light" ? (
        <Moon className="h-[1.2rem] w-[1.2rem] transition-all" />
      ) : (
        <Sun className="h-[1.2rem] w-[1.2rem] transition-all text-yellow-400" />
      )}
      <span className="sr-only">تبديل الوضع</span>
    </Button>
  );
}
