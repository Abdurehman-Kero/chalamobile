// react-native-vector-icons ships no types. Only the Feather set is used.
declare module 'react-native-vector-icons/Feather' {
  import { Component } from 'react';
  import { StyleProp, TextStyle } from 'react-native';
  interface IconProps { name: string; size?: number; color?: string; style?: StyleProp<TextStyle> }
  export default class Feather extends Component<IconProps> {}
}
