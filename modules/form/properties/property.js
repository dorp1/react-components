import React from 'react';
import classNames from 'classnames';
import CssModules from 'react-css-modules';

import InputCheckbox from '../inputs/input_checkbox';

import { validateInput } from '../utils/private/validation_utils';

import { noop, safeInvoke } from '../../utils/general';

import styles from './property.scss';


const { bool, element, func, node, shape, string } = React.PropTypes;

// Default layouts
const PropertyErrorLabel = CssModules(({ children }) => (
    <div styleName="label-error">{children}</div>
), styles);

const PropertyFooter = CssModules(({ children }) => (
    <div styleName="footer">{children}</div>
), styles);

const PropertyLabel = CssModules((props) => (<label {...props} styleName="label" />), styles);

// The default layout component acts as both the Property container and its body
const PropertyLayout = CssModules(({ children, handleFocus, status }) => (
    <div
        onClick={handleFocus}
        styleName={classNames('body', status ? `property-${status}` : 'property')}>
        {children}
    </div>
), styles, { allowMultiple: true });

PropertyErrorLabel.displayName = 'PropertyError';
PropertyFooter.displayName = 'PropertyFooter';
PropertyLabel.displayName = 'PropertyLabel';
PropertyLayout.displayName = 'PropertyLayout';

const Property = React.createClass({
    propTypes: {
        children: element.isRequired,
        name: string.isRequired,

        autoFocus: bool,
        className: string,
        createErrorMessage: func,
        disabled: bool,
        errorLabelType: func,
        footer: node,
        footerType: func,
        hidden: bool,
        highlighted: bool,
        ignoreFocus: bool,
        label: node,
        labelType: func,
        layoutType: func,
        onBlur: func,
        onChange: func,
        onFocus: func,

        /**
         * By default, Properties will inherit some props from the parent Form for form-wide
         * attributes. Use `overrideFormDefaults` to signal to the parent Form that this
         * Property should avoid inheriting attributes and only use its own props.
         *
         * Note that this prop is only used by the Form when it registers Properties, so it is
         * not used elsewhere in this component.
         *
         * Currently inherited properties:
         *   - disabled: Disable this property
         */
        overrideFormDefaults: bool
    },

    getDefaultProps() {
        return {
            createErrorMessage: (errorProp) => {
                switch (errorProp) {
                  case 'min' || 'max':
                    return 'The value you defined is not in the valid range';
                  case 'pattern':
                    return 'The value you defined is not matching the valid pattern';
                  case 'required':
                    return 'This field is required';
                  default:
                    return null;
                }
            },
            errorLabelType: PropertyErrorLabel,
            footerType: PropertyFooter,
            labelType: PropertyLabel,
            layoutType: PropertyLayout
        };
    },

    getInitialState() {
        const defaultValue = this.getDefaultValuePropOfChild();

        return {
            /**
             * initialValue is used to reset the child input to its initial state. We initially use
             * the child's defaultValue as this value, but this can change later on as the form gets
             * submitted and further changes are made (if the form has already been submitted,
             * resetting the form afterwards should restore it to its last submission state).
             */
            initialValue: defaultValue,

            errorMessage: null,
            isFocused: false,

            /**
             * `value` is a representation of the child input's value that is used only to control
             * the input (ie. handle its edited value); any time we need to use the input's value,
             * we request it directly using its value property (on native inputs) or `getValue()`.
             *
             * With react 15.0, we have to make sure that valueless controlled inputs should use
             * value="" instead of value={null}.
             */
            value: defaultValue || ''
        };
    },

    componentDidMount() {
        if (this.props.autoFocus) {
            this.focus();
        }
    },

    reset() {
        const { initialValue } = this.state;

        this.setState({
            value: initialValue
        });

        // In case the input element needs more than just the value changed to the initial
        // value to reset it, it can expose a reset method
        safeInvoke({
            fn: this.inputElement.reset,
            context: this.inputElement
        });

        return initialValue;
    },

    focus() {
        if (this.props.ignoreFocus) {
            return;
        }

        // Safe invoke in case the inputElement is a component without a focus function
        safeInvoke({
            fn: this.inputElement.focus,
            context: this.inputElement
        });
    },

    onInputChange(event) {
        const { name, onChange } = this.props;
        let value;

        if (event && event.target) {
            const { target } = event;

            if (target.type === 'checkbox') {
                value = target.checked;
            } else {
                value = target.value;
            }
        }

        this.setState({ value }, () => safeInvoke(onChange, value, name));
    },

    onBlur(event) {
        this.setState({ isFocused: false }, () => safeInvoke(this.props.onBlur, event));
    },

    onFocus(event) {
        this.setState({ isFocused: true }, () => safeInvoke(this.props.onFocus, event));
    },

    // Required by Form API
    onSubmitError() {
        // If submission failed, just unfocus any properties in the form
        this.setState({
            isFocused: false
        });
    },

    // Required by Form API
    onSubmitSuccess() {
        const newState = {
            isFocused: false
        };

        // Also update initialValue in case of the user updating and canceling their actions again.
        // We avoid doing this if we're already removing our child input's value as the "removed"
        // value isn't really representative of the input's default or last submitted value.
        if (!this.getChild().props.removeValue) {
            newState.initialValue = this.getValueOfInputElement();
        }

        this.setState(newState);
    },

    getChild() {
        // Ensure that only one child is used per property; if there is more than one child,
        // React.Children.only() will throw
        return React.Children.only(this.props.children);
    },

    // Required by Form API
    getValue() {
        return this.getValueOfInputElement();
    },

    getDefaultValuePropOfChild() {
        const child = this.getChild();
        const { defaultChecked, defaultValue } = child.props;

        switch (this.getInputTypeOfChild(child)) {
          case 'checkbox':
            return defaultChecked;
          default:
            return defaultValue;
        }
    },

    getInputTypeOfChild(child) {
        child = child || this.getChild();

        if (child.type === InputCheckbox) {
            // Although InputCheckbox is a custom input, its API follows the native checkbox API
            return 'checkbox';
        } else if (child.props.hasOwnProperty('type')) {
            // Just reutrn the native input's type
            return child.props.type;
        } else {
            // All other custom inputs should follow the default input API
            return 'normal';
        }
    },

    getValueOfInputElement() {
        const { getValue = noop, type, value } = this.inputElement;

        if (type === 'checkbox') {
            // Catch native checkboxes, ie. input[type="checkbox"], if they are used instead of a
            // custom input component
            return this.inputElement.checked;
        } else {
            // If our child input is not a native input element, we expect it to have a `getValue()`
            // method that give us its value.
            return value != null ? value : getValue();
        }
    },

    getStatus() {
        const { disabled, highlighted, hidden } = this.props;
        const { errorMessage, isFocused } = this.state;

        if (hidden) {
            return 'hidden';
        } else if (disabled) {
            return 'fixed';
        } else if (errorMessage) {
            return 'error';
        } else if (isFocused) {
            return 'focused';
        } else if (highlighted) {
            return 'highlighted';
        }
    },

    renderChildren() {
        const { children, disabled, ignoreFocus, name } = this.props;
        const { initialValue, value } = this.state;

        const child = this.getChild();
        const {
            onBlur,
            onChange,
            onFocus,
            removeValue // If set on the child, reset this child input's defaultValue and value
                        // to ''
        } = child.props;

        // Change the defaultValue and value props based on different input types (ie. checkboxes)
        let defaultValueProp;
        let valueProp;

        switch(this.getInputTypeOfChild(child)) {
          case 'checkbox':
            defaultValueProp = 'defaultChecked';
            valueProp = 'checked';
            break;
          default:
            defaultValueProp = 'defaultValue';
            valueProp = 'value';
            break;
        }

        return React.cloneElement(child, {
            ref: (ref) => {
                this.inputElement = ref;

                // By attaching refs to the child from this component, we're overwriting any
                // already attached refs to the child. As we'd still like to allow parents
                // to register refs with the child inputs, we need to invoke their callback
                // refs with our refs here.
                safeInvoke({
                    fn: child.ref,
                    context: child,
                    params: [ref]
                });
            },

            disabled,
            name,

            // Similar to how the child input's value is controlled using this Property's `value`
            // state, the input's defaultValue is also controlled with the `initialValue` state.
            // This allows a reset to return the input's value to its last submitted value rather
            // than the initial value it had upon its initial render (although if no changes have
            // been made, these two will be the same).
            [defaultValueProp]: removeValue ? '' : initialValue,

            // Control the child input's with this Property
            [valueProp]: removeValue ? '' : value,

            onBlur: (...args) => {
                safeInvoke(onBlur, ...args);
                this.onBlur(...args);
            },
            onChange: (...args) => {
                safeInvoke(onChange, ...args);
                this.onInputChange(...args);
            },
            onFocus: ignoreFocus ? noop : (...args) => {
                safeInvoke(onFocus, ...args);
                this.onFocus();
            }
        });
    },

    // Required by Form API
    validate() {
        const errorProp = validateInput(this.inputElement, this.getValueOfInputElement());
        const newState = { errorMessage: null };

        if (errorProp) {
            const { invoked, result: errorMessage } = safeInvoke(this.props.createErrorMessage, errorProp);

            if (invoked && errorMessage) {
                newState.errorMessage = errorMessage;
            }
        }

        this.setState(newState);
        return errorProp;
    },

    render() {
        const {
            className,
            footer,
            label,
            name,
            errorLabelType: ErrorLabelType,
            footerType: FooterType,
            labelType: LabelType,
            layoutType: LayoutType
        } = this.props;
        const { errorMessage } = this.state;

        const errorElement = ErrorLabelType && errorMessage ? (
            <ErrorLabelType>{errorMessage}</ErrorLabelType>
        ) : null;

        const labelElement = LabelType && label ? (<LabelType htmlFor={name}>{label}</LabelType>)
                                                : null;

        const footerElement = FooterType && footer ? (<FooterType>{footer}</FooterType>) : null;

        return (
            <LayoutType
                className={className}
                handleFocus={this.focus}
                status={this.getStatus()}>
                {errorElement}
                {labelElement}
                {this.renderChildren()}
                {footerElement}
            </LayoutType>
        );
    }
});

export default Property;
