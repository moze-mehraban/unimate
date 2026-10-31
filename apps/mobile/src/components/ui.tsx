import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { toFaDigits } from "@unimate/shared";
import { FONT, useColors } from "@/lib/theme";

type Weight = keyof typeof FONT;

/** Text in Vazirmatn. Use `weight`, not fontWeight: each weight is a separate font file. */
export function AppText({
  weight = "regular",
  size = 15,
  tone = "foreground",
  style,
  ...props
}: TextProps & { weight?: Weight; size?: number; tone?: "foreground" | "muted" | "primary" | "danger" | "success" }) {
  const c = useColors();
  return (
    <Text
      {...props}
      style={[{ fontFamily: FONT[weight], fontSize: size, color: c[tone], lineHeight: size * 1.7 }, style]}
    />
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return (
    <View style={[{ backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 16, padding: 16 }, style]}>
      {children}
    </View>
  );
}

export function Button({
  children,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
}: {
  children: ReactNode;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const bg = variant === "primary" ? c.primary : "transparent";
  const fg = variant === "primary" ? c.primaryForeground : variant === "danger" ? c.danger : c.foreground;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderColor: variant === "primary" ? c.primary : c.border,
          borderWidth: 1,
          borderRadius: 10,
          paddingVertical: 11,
          paddingHorizontal: 16,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 8,
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={fg} /> : null}
      <AppText weight="medium" style={{ color: fg }}>
        {children}
      </AppText>
    </Pressable>
  );
}

export function Field({
  label,
  error,
  hint,
  style,
  ...props
}: TextInputProps & { label: string; error?: string; hint?: string; style?: StyleProp<TextStyle> }) {
  const c = useColors();
  return (
    <View style={{ gap: 6 }}>
      <AppText weight="medium" size={14}>
        {label}
      </AppText>
      <TextInput
        placeholderTextColor={c.muted}
        {...props}
        style={[
          {
            fontFamily: FONT.regular,
            fontSize: 15,
            color: c.foreground,
            backgroundColor: c.surface,
            borderColor: error ? c.danger : c.border,
            borderWidth: 1,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            // Emails and passwords are Latin; everything else follows the RTL layout.
            ...(props.keyboardType === "email-address" || props.secureTextEntry ? { writingDirection: "ltr" as const } : null),
          },
          props.multiline ? { minHeight: 100, textAlignVertical: "top" } : null,
          style,
        ]}
      />
      {error ? (
        <AppText size={12} tone="danger">
          {error}
        </AppText>
      ) : hint ? (
        <AppText size={12} tone="muted">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

export function Banner({ kind, children }: { kind: "error" | "success"; children: ReactNode }) {
  const c = useColors();
  return (
    <View
      accessibilityRole="alert"
      style={{ backgroundColor: kind === "error" ? c.dangerSoft : c.successSoft, borderRadius: 10, padding: 12 }}
    >
      <AppText size={14} tone={kind === "error" ? "danger" : "success"}>
        {children}
      </AppText>
    </View>
  );
}

/** A row of mutually exclusive options (tabs, priority, status). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  activeColors,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  /** Per-option colors for the selected chip; defaults to a surface chip. */
  activeColors?: Partial<Record<T, { bg: string; fg: string }>>;
}) {
  const c = useColors();
  return (
    <View
      role="radiogroup"
      style={{ flexDirection: "row", backgroundColor: c.background, borderRadius: 10, padding: 3, alignSelf: "flex-start" }}
    >
      {options.map((o) => {
        const selected = o.value === value;
        const colors = selected ? (activeColors?.[o.value] ?? { bg: c.surface, fg: c.foreground }) : null;
        return (
          <Pressable
            key={o.value}
            role="radio"
            aria-checked={selected}
            onPress={() => onChange(o.value)}
            style={{ backgroundColor: colors?.bg ?? "transparent", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 }}
          >
            <AppText size={13} weight={selected ? "medium" : "regular"} style={{ color: colors?.fg ?? c.muted }}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Loading() {
  const c = useColors();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
      <ActivityIndicator color={c.primary} />
    </View>
  );
}

/** A titled card on the class screen, with an optional count badge and action. */
export function Section({
  title,
  count,
  action,
  children,
}: {
  title: string;
  count?: number;
  action?: ReactNode;
  children: ReactNode;
}) {
  const c = useColors();
  return (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <AppText weight="bold">{title}</AppText>
        {count ? (
          <View style={{ backgroundColor: `${c.primary}1a`, borderRadius: 999, paddingHorizontal: 8 }}>
            <AppText size={12} tone="primary">
              {toFaDigits(count)}
            </AppText>
          </View>
        ) : null}
        {action ? (
          <>
            <View style={{ flex: 1 }} />
            {action}
          </>
        ) : null}
      </View>
      {children}
    </Card>
  );
}

/** Small text button for row actions (approve, revoke, remove…). */
export function SmallButton({
  children,
  onPress,
  tone = "neutral",
  disabled,
}: {
  children: string;
  onPress: () => void;
  tone?: "neutral" | "primary" | "danger";
  disabled?: boolean;
}) {
  const c = useColors();
  const fg = tone === "primary" ? c.primaryForeground : tone === "danger" ? c.danger : c.foreground;
  return (
    <Pressable
      role="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        backgroundColor: tone === "primary" ? c.primary : "transparent",
        borderColor: tone === "primary" ? c.primary : c.border,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
        opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
      })}
    >
      <AppText size={13} weight="medium" style={{ color: fg }}>
        {children}
      </AppText>
    </Pressable>
  );
}
