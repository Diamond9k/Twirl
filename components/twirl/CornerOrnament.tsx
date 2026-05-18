import Svg, { Circle, Path } from "react-native-svg";

type Props = {
  opacity?: number;
};

export function CornerOrnament({ opacity = 0.5 }: Props) {
  return (
    <Svg width={120} height={120} viewBox="0 0 120 120" style={{ opacity }}>
      <Path d="M10 60 Q 60 10, 110 60" fill="none" stroke="#B84565" strokeOpacity={0.15} strokeWidth={0.8} />
      <Path d="M20 60 Q 60 20, 100 60" fill="none" stroke="#B84565" strokeOpacity={0.2} strokeWidth={0.5} />
      <Circle cx={60} cy={60} r={1.2} fill="#B84565" fillOpacity={0.4} />
    </Svg>
  );
}
