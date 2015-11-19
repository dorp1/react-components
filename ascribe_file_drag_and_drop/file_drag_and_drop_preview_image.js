'use strict';

import React from 'react';
import ProgressBar from 'react-bootstrap/lib/ProgressBar';

import AscribeSpinner from '../../ascribe_spinner';
import { getLangText } from '../../../utils/lang_utils';


const { number, string, func, bool } = React.PropTypes;

const FileDragAndDropPreviewImage = React.createClass({
    propTypes: {
        progress: number,
        url: string,
        toggleUploadProcess: func,
        downloadUrl: string,
        areAssetsDownloadable: bool
    },

    getInitialState() {
        return {
            paused: true
        };
    },

    toggleUploadProcess(e) {
        e.preventDefault();
        e.stopPropagation();

        this.setState({
            paused: !this.state.paused
        });

        this.props.toggleUploadProcess();
    },

    render() {
        let imageStyle = {
            backgroundImage: 'url("' + this.props.url + '")',
            backgroundSize: 'cover'
        };

        let actionSymbol;
        
        if(this.props.progress > 0 && this.props.progress < 99 && this.state.paused) {
            actionSymbol = <span className="glyphicon glyphicon-pause action-file" aria-hidden="true" title={getLangText('Pause upload')} onClick={this.toggleUploadProcess}/>;
        } else if(this.props.progress > 0 && this.props.progress < 99 && !this.state.paused) {
            actionSymbol = <span className="glyphicon glyphicon-play action-file" aria-hidden="true" title={getLangText('Resume uploading')} onClick={this.toggleUploadProcess}/>;
        } else if(this.props.progress === 100) {

            // only if assets are actually downloadable, there should be a download icon if the process is already at
            // 100%. If not, no actionSymbol should be displayed
            if(this.props.areAssetsDownloadable) {
                actionSymbol = <a href={this.props.downloadUrl} target="_blank" className="glyphicon glyphicon-download action-file" aria-hidden="true" title={getLangText('Download file')}/>;
            }

        } else {
            actionSymbol = (
                <div className="spinner-file">
                    <AscribeSpinner color='dark-blue' size='md' />
                </div>
            );
        }

        return (
            <div
                className="file-drag-and-drop-preview-image"
                style={imageStyle}>
                    <ProgressBar
                        now={Math.ceil(this.props.progress)}
                        className="ascribe-progress-bar ascribe-progress-bar-xs"/>
                    {actionSymbol}
            </div>
        );
    }
});

export default FileDragAndDropPreviewImage;
