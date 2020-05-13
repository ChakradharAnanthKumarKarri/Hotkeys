export const HotkeysProvider = function() {
    
    /**
     * Holds the collection of different scopes that hotkeys are bound
     * @type {Object}
     */
    let _boundScopes = {};

    /**
     * Holds the collection of all the callbacks configured
     * @type {Object}
     */
    let _callbacks = {};

    /**
     * mapping of string key combinations to callbacks used for event callback trigger()
     * @type {Object}
     */
    let _keyCallbackMap = {};

    /**
     * Main element to attach key events
     * @type {Element}
     */
    const _targetElement = document.querySelector('body');

    /**
     * Check whethere to add/detach the key event to the target element
     * @type {Boolean}
     */
    let _eventAdded = false;
    
    /**
     * mapping of special keycodes to their corresponding keys
     *
     * everything in this dictionary cannot use keypress events
     * so it has to be here to map to the correct keycodes for
     * keyup/keydown events
     *
     * @type {Object}
     */
    let _SPECIAL_KEYCODES_MAP = {
        8: 'backspace',
        9: 'tab',
        13: 'enter',
        16: 'shift',
        17: 'ctrl',
        18: 'alt',
        20: 'capslock',
        27: 'esc',
        32: 'space',
        33: 'pageup',
        34: 'pagedown',
        35: 'end',
        36: 'home',
        37: 'left',
        38: 'up',
        39: 'right',
        40: 'down',
        45: 'ins',
        46: 'del',
        91: 'meta',
        93: 'meta',
        224: 'meta'
    };

    /**
     * mapping for special characters so they can support
     *
     * this dictionary is only used incase you want to bind a
     * keyup or keydown event to one of these keys
     *
     * @type {Object}
     */
    let _SPECIAL_CHARACTERS_MAP = {
        106: '*',
        107: '+',
        109: '-',
        110: '.',
        111 : '/',
        186: ';',
        187: '=',
        188: ',',
        189: '-',
        190: '.',
        191: '/',
        192: '`',
        219: '[',
        220: '\\',
        221: ']',
        222: '\''
    };

    /**
     * this is a list of special strings you can use to map
     * to modifier keys when you specify your keyboard shortcuts
     *
     * @type {Object}
     */
    let _SPECIAL_ALIASES = {
        'option': 'alt',
        'command': 'meta',
        'return': 'enter',
        'escape': 'esc',
        'plus': '+',
        'mod': /Mac|iPod|iPhone|iPad/.test(navigator.platform) ? 'meta' : 'ctrl'
    };

    /**
     * loop through the f keys, f1 to f12 and add them to the map
     */
    for (let i = 1; i <= 12; ++i) {
        _SPECIAL_KEYCODES_MAP[111 + i] = 'f' + i;
    }

    /**
     * loop through to map numbers on the numeric keypad
     */
    for (let i = 0; i <= 9; ++i) {
        _SPECIAL_KEYCODES_MAP[i + 96] = i.toString();
    }

    /**
     * Enable/disable the help menu
     * @type {Boolean}
     */
    const includeHelpMenu = true;

    /**
     * Help menu template to show the hotkeys.
     * @type {String}
     */
    const template = '<div class="hotkeys-container hide" ng-class="{in: helpVisible}" style="display: none;"><div class="hotkeys">' +
        '<h4 class="hotkeys-title" ng-if="!header">{{ title }}</h4>' +
        '<div ng-bind-html="header" ng-if="header"></div>' +
        '<table><tbody>' +
        '<tr ng-repeat="hotkey in hotkeys | filter:{ description: \'!$$undefined$$\' }">' +
            '<td class="hotkeys-keys">' +
            '<span class="hotkeys-key">{{ hotkey.combo }}</span>' +
            '</td>' +
            '<td class="hotkeys-text">{{ hotkey.description }}</td>' +
        '</tr>' +
        '</tbody></table>' +
        '<div ng-bind-html="footer" ng-if="footer"></div>' +
        '<div class="hotkeys-close" ng-click="toggleHelpMenu()">&#215;</div>' +
    '</div></div>';

    this.$get = function ($rootScope, $document, $rootElement, $compile, $timeout) {
        'ngInject';

        /**
         * A new scope used internally for the help menu
         * @type {$rootScope.Scope}
         */
        let hotkeysScope = $rootScope.$new();

        /**
         * Holds currently bound array of Hotkey objects
         * @type {Array}
         */
        hotkeysScope.hotkeys = [];

        /**
         * Enable/disable help menu's visibility
         * @type {Boolean}
         */
        hotkeysScope.helpVisible = false;

        /**
         * Title for the help menu
         * @type {String}
         */
        hotkeysScope.title = 'Hotkeys:';

        /**
         * Header HTML for the help menu
         * @type {String}
         */
        hotkeysScope.header = null;

        /**
         * Footer HTML for the help menu
         * @type {String}
         */
        hotkeysScope.footer = null;

        /**
         * Attach this function to hotkeys scope so we can call it using
         * ng-click from the template
         * @type {function}
         */
        hotkeysScope.toggleHelpMenu = _toggleHelpMenu;

        /**
         * Create a help menu and append to DOM
         *
         * @returns  void
         */
        function _addHelpMenu () {
            if (includeHelpMenu) {
                const document = $document[0];
                let element = $rootElement[0];
                const helpMenuElement = angular.element(template);

                _add('f1', 'Show/Hide hotkeys help menu', _toggleHelpMenu);

                if (element === document || element === document.documentElement) {
                    element = document.body;
                }
                
                angular.element(element).append($compile(helpMenuElement)(hotkeysScope));
            }
        }

        /**
         * Toggle help menu
         *
         * @returns  {Boolean}
         */
        function _toggleHelpMenu () {
            $timeout(function() {
                hotkeysScope.helpVisible = !hotkeysScope.helpVisible;
            }, 0);

            return false;
        }

        /**
         * Gets a Hotkey object by key binding
         *
         * @param  {[String]} [combo]  Key that Hotkey is bound to. Returns all key bindings if no key is passed
         * @returns  {Hotkey}          Hotkey object
         */
        function _get (combo) {
            if (!combo) {
                return hotkeysScope.hotkeys;
            }

            let hotkey;

            for (var i = 0; i < hotkeysScope.hotkeys.length; i++) {
                hotkey = hotkeysScope.hotkeys[i];
        
                if (hotkey.combo.indexOf(combo) > -1) {
                    return hotkey;
                }
            }
    
            return false;
        }
                
        /**
         * cross browser add event method
         *
         * @param  {Element|HTMLDocument}  targetElement
         * @param  {String}  type
         * @param  {Function}  callback
         * @returns  void
         */
        function _addEvent (targetElement, type, callback) {
            _eventAdded = true;

            if (targetElement.addEventListener) {
                targetElement.addEventListener(type, callback, false);
                return;
            }

            targetElement.attachEvent('on' + type, callback);
        }

        /**
         * cross browser remove event method
         *
         * @param  {Element|HTMLDocument}  targetElement
         * @param  {String}  type
         * @param  {Function}  callback
         * @returns  void
         */
        function _removeEvent (targetElement, type, callback) {
            _eventAdded = false;

            if (targetElement.removeEventListener) {
                targetElement.removeEventListener(type, callback, false);
                return;
            }

            targetElement.detachEvent('on' + type, callback);
        }

        /**
         * takes a key event and figures out what the modifiers are
         *
         * @param  {Event}  e
         * @returns  {Array}
         */
        function _getEventModifiers (e) {
            let modifiers = [];

            if (e.shiftKey) {
                modifiers.push('shift');
            }

            if (e.altKey) {
                modifiers.push('alt');
            }

            if (e.ctrlKey) {
                modifiers.push('ctrl');
            }

            if (e.metaKey) {
                modifiers.push('meta');
            }

            return modifiers;
        }

        /**
         * takes a key event and figures out what the modifiers are
         *
         * @param  {Element|HTMLDocument}  element
         * @param  {Element|HTMLDocument}  rootElement
         * @returns  {Boolean}
         */
        function _belongsTo (element, rootElement) {
            if (element === null || element === _targetElement) {
                return false;
            }

            if (element === rootElement) {
                return true;
            }

            return _belongsTo(element.parentNode, rootElement);
        }

        /**
         * should we stop this event before firing off callbacks
         *
         * @param {Event} e
         * @param {Element} element
         * @returns {Boolean}
         */
        function _stopCallback (e, element) {
            if (_belongsTo(element, _targetElement)) {
                return false;
            }

            // stop for input, select, and textarea (not a handsontable)
            const isHandsontable = (element.id && element.id.toLowerCase().indexOf('handsontable') > -1) ||
                                    (element.className && element.className.toLowerCase().indexOf('handsontable') > -1);
            return element.tagName == 'INPUT' || element.tagName == 'SELECT' || (element.tagName == 'TEXTAREA' && !isHandsontable) || element.isContentEditable;
        };

        /**
         * prevents default for this event
         *
         * @param  {Event}  e
         * @returns  void
         */
        function _preventDefault (e) {
            if (e.preventDefault) {
                e.preventDefault();
                return;
            }

            e.returnValue = false;
        }

        /**
         * stops propogation for this event
         *
         * @param  {Event}  e
         * @returns  void
         */
        function _stopPropagation (e) {
            if (e.stopPropagation) {
                e.stopPropagation();
                return;
            }

            e.cancelBubble = true;
        }

        /**
         * calls the callback function
         *
         * if your callback function returns false this will use the jquery
         * convention - prevent default and stop propogation on the event
         *
         * @param  {Function}  callback
         * @param  {Event}  e
         * @param  {String}  combo
         * @returns  void
         */
        function _fireCallback (callback, e, combo) {
            // if this event should not be happened, stop here
            if (_stopCallback(e, e.target || e.srcElement)) {
                return;
            }

            if (callback(e, combo) === false) {
                _preventDefault(e);
                _stopPropagation(e);
            }
        }

        /**
         * finds all callbacks that match based on the keycode, modifiers
         *
         * @param  {String}  character
         * @param  {Array}  modifiers
         * @param  {Event|Object}  e
         * @param  {String?}  combo
         * @returns  {[Function]}
         */
        function _getMatches (character, modifiers, e, combo?) {
            let callback;
            let matches = [];
            const action = e.type;

            // if there are no events related to this keycode
            if (!_callbacks[character]) {
                return [];
            }

            // loop through all callbacks for the key that was pressed
            // and see if any of them match
            for (let i = 0; i < _callbacks[character].length; ++i) {
                callback = _callbacks[character][i];

                if (modifiers.sort().join(',') === callback.modifiers.sort().join(',')) {
                    if (callback.combo === combo) {
                        _callbacks[character].splice(i, 1);
                    }
                    matches.push(callback);
                }
            }

            return matches;
        }

        /**
         * handles a character key event
         *
         * @param  {String}  character
         * @param  {Array}  modifiers
         * @param  {Event}  e
         * @returns  void
         */
        function _handleKey (character, modifiers, e) {
            let callbacks = _getMatches(character, modifiers, e);

            // loop through matching callbacks for this character key event
            for (let i = 0; i < callbacks.length; ++i) {
                _fireCallback(callbacks[i].callback, e, callbacks[i].combo);
            }
        }

        /**
         * Returns the key character
         *
         * @param  {Event}  e
         * @returns  {String}
         */
        function _characterFromEvent (e) {
            if (_SPECIAL_KEYCODES_MAP[e.which]) {
                return _SPECIAL_KEYCODES_MAP[e.which];
            }

            if (_SPECIAL_CHARACTERS_MAP[e.which]) {
                return _SPECIAL_CHARACTERS_MAP[e.which];
            }

            // with keydown event the character seems to always come in as an uppercase
            // character, whether you are pressing shift or not.
            // we should make sure it is always lowercase for comparisons
            return String.fromCharCode(e.which).toLowerCase();
        }

        /**
         * handles a keydown event
         *
         * @param  {Event}  e
         * @returns void
         */
        function _handleKeyEvent (e) {
            //if (e.shiftKey && e.keyCode === 16) return;
            if (typeof e.which !== 'number') {
                e.which = e.keyCode;
            }

            let character = _characterFromEvent(e);
            
            // if no character then stop
            if (!character) {
                return;
            }

            _handleKey(character, _getEventModifiers(e), e);
        }

        /**
         * Converts a string key combination to an array
         *
         * @param  {String}  combo  "Alt+s"
         * @returns  {[String]}
         */
        function _keysFromString (combo) {
            if (combo === '+') {
                return ['+'];
            }

            combo = combo.replace(/\+{2}/g, '+plus');
            return combo.split('+');
        }

        /**
         * determines if the key is a modifier or not
         *
         * @param  {String}  key
         * @returns  {Boolean}
         */
        function _isModifier (key) {
            return key === 'shift' || key === 'ctrl' || key === 'alt';
        }

        /**
         * Gets info with keys and modifiers for a particular key combination
         *
         * @param  {String}  combo  key combination
         * @returns  {Object}
         */
        function _getKeyInfo (combo) {
            let keys, key, modifiers = [];

            keys = _keysFromString.call(this, combo);

            for (let i = 0; i < keys.length; ++i) {
                key = keys[i] ? keys[i].toLowerCase() : keys[i];

                if (_SPECIAL_ALIASES[key]) {
                    key = _SPECIAL_ALIASES[key];
                }
                
                if (_isModifier(key)) {
                    modifiers.push(key);
                }
            }

            return {
                key,
                modifiers
            };
        }

        /**
         * Binds a single hotkey combination
         *
         * @param  {String}  combo
         * @param  {Function}  callback
         * @returns  void
         */
        function _bindHotkey (combo, description, callback) {
            _keyCallbackMap[combo] = callback;
            
            const keyInfo = _getKeyInfo(combo);
            _callbacks[keyInfo.key] = _callbacks[keyInfo.key] || [];

            _getMatches(keyInfo.key, keyInfo.modifiers, {type: 'keydown'}, combo);

            if (typeof callback === 'function' && callback.toString().replace(/\s/g, '') !== 'function(){}') {
                const hotkey = {
                    callback,
                    modifiers: keyInfo.modifiers,
                    combo,
                    description
                };
                
                _callbacks[keyInfo.key].push(hotkey);
                hotkeysScope.hotkeys.push(hotkey);
            }

            if (_callbacks[keyInfo.key].length === 0) {
                delete _callbacks[keyInfo.key];
                delete _keyCallbackMap[combo];
            }

            if (Object.keys(_callbacks).length === 0 && _eventAdded) {
                _removeEvent(_targetElement, 'keydown', _handleKeyEvent);
            }
        }

        /**
         * Unbinds the hotkey.
         *
         * @param  {String|[String]}  keys  The hotkey combination to be removed
         * @returns  void
         */
        function _unbindHotkey (keys) {
            const self = this;
            keys = keys instanceof Array ? keys : [keys];
            
            if (Object.prototype.toString.call(keys) === '[object Array]') {
                for (let i = 0; i < keys.length; ++i) {
                    _bindHotkey.call(self, keys[i], '', function () {});
                }
            }
        }

        /**
         * Creates a new Hotkey
         *
         * @param  {Object|String|[String]}  keys  hotkey combination (String/Array) or object contains hotkey combination and callback
         * @param  {Function}  callback  callback method to trigger when key is pressed
         * @returns  {Object}  {combo, callback}
        */
        function _add (keys, description, callback) {
            if (!_eventAdded) {
                _addEvent(_targetElement, 'keydown', _handleKeyEvent);
            }

            if (Object.prototype.toString.call(keys) === '[object Object]') {
                callback = keys.callback;
                description = keys.description;
                keys = keys.keys;
            }
            keys = keys instanceof Array ? keys : [keys];

            if (Object.prototype.toString.call(keys) === '[object Array]' &&
                typeof callback === 'function') {
                for (let i = 0; i < keys.length; ++i) {
                    _del(keys[i]);
                    _bindHotkey(keys[i], description, callback);
                }
            }

            return {
                combo: keys,
                description,
                callback
            };
        }

        /**
         * Deletes a Hotkey
         *
         * @param  {Object|String}  combo  hotkey combination or object contains hotkey combination and callback
         * @returns  {Boolean}  
        */
        function _del (combo) {
            const self = this;
            
            combo = combo.combo ? combo.combo : combo;
            _unbindHotkey.call(self, combo);

            if (angular.isArray(combo)) {
                let returnValue = true;
                let i = combo.length;
                while (i--) {
                    returnValue = _del(combo[i]) && returnValue;
                }
                return returnValue;
            } else {
                const scopeIndex = hotkeysScope.hotkeys.indexOf(_get(combo));
                const hotkey = hotkeysScope.hotkeys[scopeIndex];

                if (scopeIndex > -1) {
                    // remove hotkey from bound scopes
                    angular.forEach(_boundScopes, function (_boundScope: any) {
                        const boundScopeIndex = _boundScope.indexOf(combo);
                        //const boundScopeIndex = _boundScope.indexOf(hotkey);
                        if (boundScopeIndex !== -1) {
                            _boundScope.splice(boundScopeIndex, 1);
                        }
                    });

                    hotkeysScope.hotkeys.splice(scopeIndex, 1);

                    return true;
                }
            }

            return false;
        }

        /**
         * Unbinds the hotkey to a specific scope.
         *
         * @param  {Object}  scope  The scope to bind hotkeys to
         * @returns  void
         */
        function unbind (scope) {
            let len = _boundScopes[scope.$id].length;
            while (len--) {
                _del(_boundScopes[scope.$id].pop());
            }
            const total = Object.keys(_boundScopes).reduce((accumulator, currentValue) => accumulator + _boundScopes[currentValue].length, 0);
            if (total === 0) {
                _del('f1');
            }
        }
        
        /**
         * Binds the hotkey to a specific scope.
         * If the scope is destroyed, we can automatically delete the hotkey binding.
         *
         * @param  {Object}  scope  The scope to bind hotkeys to
         */
        function bind (scope) {
            const self = this;
            // Initialize once to bind multiple hotkeys for same scope
            if (!(scope.$id in _boundScopes)) {
                // Add the new scope to the list of bound scopes
                _boundScopes[scope.$id] = [];

                scope.$on('$destroy', function () {
                    unbind.call(self, scope);
                });
            }

            // return an object with an add function as a chaining method
            return {
                add: function (args) {
                    let hotkey;
                    let {
                        keys = '',
                        description = '',
                        callback = () => { throw 'Callback is not provided'; }
                    } = args;
                    
                    hotkey = _add.call(self, keys, description, callback);

                    _boundScopes[scope.$id].push(hotkey);
                    return this;
                }
            };
        }

        _addHelpMenu();

        return {
            bind,
            unbind,
            add: _add,
            del: _del,
        };
    };
            
};
