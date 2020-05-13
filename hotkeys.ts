import { HotkeysProvider } from './hotkeys.service';
import './hotkeys.scss';

const hotkeysModule = angular.module('hotkeys', []);

hotkeysModule.provider('Hotkeys', new HotkeysProvider());

export default hotkeysModule;
