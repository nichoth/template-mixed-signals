import { html } from 'htm/preact'
import { type FunctionComponent } from 'preact'
import { type Signal, useSignal } from '@preact/signals'
import { SubstrateButton } from '@substrate-system/button'
import '@substrate-system/button/css'
import './button.css'

interface ButtonProps {
    onClick?:(ev:MouseEvent)=>void|Promise<void>;
    isSpinning?:Signal<boolean>;
    className?:string;
    disabled?:boolean;
}

export const Button:FunctionComponent<ButtonProps> = function (props) {
    const { isSpinning: _isSpinning, ..._props } = props
    const isSpinning = _isSpinning || useSignal<boolean>(false)

    const classes = ([
        'btn',
        props.className,
        isSpinning.value ? 'spinning' : ''
    ])
        .filter(Boolean)
        .join(' ')
        .trim()

    async function click (ev:MouseEvent) {
        if (props.onClick) {
            isSpinning.value = true
            await props.onClick(ev)
            isSpinning.value = false
        }
    }

    return html`<${SubstrateButton.TAG}
        ...${_props}
        onClick=${click}
        disabled=${isSpinning.value || _props.disabled}
        spinning=${isSpinning.value ? '' : null}
        className=${classes}
    >
        <span className="btn-content">${props.children}</span>
    <//>`
}
