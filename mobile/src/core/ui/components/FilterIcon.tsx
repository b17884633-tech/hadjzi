import Svg, { Ellipse, Path } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
};

/** Clean outlined funnel + pill, matching the header filter mark. */
export function FilterIcon({ size = 22, color = '#374151' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 5.5h14c.7 0 1.1.8.7 1.35l-5.2 6.55v3.9c0 .35-.2.67-.5.85l-2.7 1.55a.9.9 0 0 1-1.35-.85v-5.45L4.3 6.85A.9.9 0 0 1 5 5.5Z"
        stroke={color}
        strokeWidth={1.65}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <Ellipse
        cx="15.2"
        cy="15.6"
        rx="2.2"
        ry="1.15"
        transform="rotate(38 15.2 15.6)"
        stroke={color}
        strokeWidth={1.55}
      />
    </Svg>
  );
}
