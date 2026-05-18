import { Text, TextInput, View } from "react-native";
import { useState } from "react";

type Props = {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
  suffix?: string;
};

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  multiline,
  suffix,
}: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View className="mb-[14px]">
      {label ? <Text className="text-twirl-ink2 text-[10px] tracking-[1.8px] uppercase mb-2">{label}</Text> : null}
      <View
        className={`rounded-xl border flex-row items-center ${focused ? "bg-twirl-blush border-twirl-pink" : "bg-twirl-paper border-twirl-line"}`}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#A89AA0"
          secureTextEntry={secureTextEntry}
          multiline={multiline}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="flex-1 text-twirl-text text-[15px] px-4 py-[15px]"
        />
        {suffix ? <Text className="text-twirl-muted text-sm pr-4">{suffix}</Text> : null}
      </View>
    </View>
  );
}
