import LunaModal from 'luna-modal/react'
import { createPortal } from 'react-dom'
import { t } from 'common/util'
import Style from './BundleInfoModal.module.scss'
import defaultIcon from '../../../assets/default-icon.png'
import { IModalProps } from 'share/common/types'
import { Copyable } from '../common/Copyable'
import { IBundleInfo } from 'common/types'
import dateFormat from 'licia/dateFormat'

interface IProps extends IModalProps {
  bundleInfo: IBundleInfo
}

export default function BundleInfoModal(props: IProps) {
  const { bundleInfo } = props

  return createPortal(
    <LunaModal
      title={t('bundleInfo')}
      visible={props.visible}
      width={400}
      onClose={props.onClose}
    >
      <div className={Style.header}>
        <div className={Style.icon}>
          <img src={bundleInfo.icon || defaultIcon} />
        </div>
        <div className={Style.basic}>
          <div className={Style.label}>{bundleInfo.label}</div>
          <Copyable className={Style.bundleName}>
            {bundleInfo.bundleName}
          </Copyable>
          <Copyable className={Style.versionName}>
            {bundleInfo.versionName}
          </Copyable>
        </div>
      </div>
      {item(t('sysBundle'), bundleInfo.system ? t('yes') : t('no'))}
      {item(t('apiTargetVersion'), bundleInfo.apiTargetVersion)}
      {bundleInfo.vendor && item(t('vendor'), bundleInfo.vendor)}
      {item(
        t('installTime'),
        dateFormat(new Date(bundleInfo.installTime), 'yyyy-mm-dd HH:MM:ss')
      )}
      {item(t('releaseType'), bundleInfo.releaseType)}
      {bundleInfo.mainAbility && item(t('mainAbility'), bundleInfo.mainAbility)}
    </LunaModal>,
    document.body
  )
}

function item(title: string, value: string | number) {
  return (
    <div className={Style.item}>
      <span>{title}</span>
      <Copyable className={Style.value}>{value}</Copyable>
    </div>
  )
}
