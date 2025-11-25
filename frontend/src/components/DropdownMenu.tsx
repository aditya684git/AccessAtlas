import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DropdownMenuProps {
  label: string;
  value: string;
  options: string[];
  onValueChange: (value: string) => void;
  ariaLabel?: string;
}

/**
 * Reusable dropdown menu component with consistent styling
 * Used across Settings for Font Size, Color Contrast, etc.
 */
const DropdownMenu = ({
  label,
  value,
  options,
  onValueChange,
  ariaLabel,
}: DropdownMenuProps) => {
  return (
    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
      <span className="font-medium">{label}</span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger 
          className="w-[140px]"
          aria-label={ariaLabel || label}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default DropdownMenu;
