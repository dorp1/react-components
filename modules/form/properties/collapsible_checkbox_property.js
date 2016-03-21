import React from 'react';
import CssModules from 'react-css-modules';

import CollapsibleProperty from './collapsible_property';
import PropertyExtender from '../utils/property_extender';

import Checkbox from '../../ui/checkbox';

import { safeInvoke } from '../../utils/general';
import { PropStuffer } from '../../utils/react';

import styles from './collapsible_checkbox_property.scss';


const { bool, element, func, string } = React.PropTypes;

const PropertyCheckboxHeading = CssModules(({ disabled, expanded, handleExpandToggle, label, name }) => (
    <div onClick={handleExpandToggle} styleName="checkbox-header">
        <Checkbox
            checked={expanded}
            disabled={disabled}
            label={label}
            name={`${name}-checkbox`}
            onChange={handleExpandToggle} />
    </div>
), styles);

PropertyCheckboxHeading.displayName = 'PropertyCheckboxHeading';

// Use PropertyExtender to shim into this component the public Property API that Form depends on.
const CollapsibleCheckboxProperty = PropertyExtender(React.createClass({
    propTypes: {
        children: element.isRequired,
        name: string.isRequired,

        checkboxLabel: string,
        checked: bool,
        disabled: bool,
        onExpandToggle: func

        // Any props used by the base Property are also passed down
    },

    componentWillMount() {
        this.registerHeaderLayout();
    },

    componentWillReceiveProps(nextProps) {
        if (nextProps.disabled !== this.props.disabled ||
            nextProps.name !== this.props.name) {
            this.registerHeaderLayout(nextProps);
        }
    },

    handleExpandToggle(expanding) {
        // Reset the property to its initial value when the checkbox is unticked (ie. when
        // `expanding` is false) since the user doesn't want to specify their own value for this
        // property.
        if (!expanding && this.refs.property) {
            this.refs.property.reset(); // Supplied by PropertyExtender and delegates to base Property
        }

        safeInvoke(this.props.onExpandToggle, expanding);
    },

    // Create a cached header type that uses our given props to avoid recreating
    // CollapsibleProperty's collapsed / expanded layouts on each render
    registerHeaderLayout(props = this.props) {
        const { disabled, name } = props;

        this.headerLayout = PropStuffer(PropertyCheckboxHeading, { disabled, name });
    },

    render () {
        const {
            checkboxLabel,
            checked,
            onExpandToggle: _, // ignore
            ...propertyProps
        } = this.props;

        return (
            <CollapsibleProperty
                ref="property"
                {...propertyProps}
                expanded={!!checked}
                headerLabel={checkboxLabel}
                headerType={this.headerLayout}
                onExpandToggle={this.handleExpandToggle} />
        );
    }
}));

export default CollapsibleCheckboxProperty;