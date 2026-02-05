import { Buffer } from 'buffer';
import process from 'process';
import 'react-native-get-random-values'; // Needed for crypto

global.Buffer = Buffer;
global.process = process;
