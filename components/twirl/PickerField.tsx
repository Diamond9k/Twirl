import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Picker } from "@react-native-picker/picker";

type Props = {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
};

/** Labeled field that shows the current value and expands a wheel picker on tap. */
export function PickerField({ label, value, options, onChange }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <View>
      <Text className="text-twirl-ink2 text-[10px] tracking-[2px] uppercase mb-2">{label}</Text>
      <TouchableOpacity
        onPress={() => setOpen((o) => !o)}
        className="bg-twirl-paper border border-twirl-line rounded-xl px-4 py-3 flex-row items-center justify-between"
      >
        <Text className="text-twirl-text">{value}</Text>
        <Text className="text-twirl-muted">{open ? "▲" : "▼"}</Text>
      </TouchableOpacity>
      {open && (
        <View className="bg-twirl-paper border border-twirl-line rounded-xl mt-2 overflow-hidden">
          <Picker selectedValue={value} onValueChange={(v) => onChange(String(v))}>
            {options.map((opt) => (
              <Picker.Item key={opt} label={opt} value={opt} />
            ))}
          </Picker>
        </View>
      )}
    </View>
  );
}
