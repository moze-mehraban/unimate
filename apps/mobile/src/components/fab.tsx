import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable } from "react-native";
import { useColors } from "@/lib/theme";

/** Round "+" button floating at the bottom end corner (left in RTL). */
export function Fab({ label, onPress }: { label: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      role="button"
      aria-label={label}
      onPress={onPress}
      style={({ pressed }) => ({
        position: "absolute",
        bottom: 20,
        end: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: c.primary,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.85 : 1,
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
      })}
    >
      <Ionicons name="add" size={28} color={c.primaryForeground} />
    </Pressable>
  );
}
