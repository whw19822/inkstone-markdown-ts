import { Monitor, Moon, Sun } from 'lucide-react'
import type { Theme, Typeface } from '@shared/types'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { useWorkspaceStore } from '@/store/workspace'

const themes: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
]
const typefaces: { value: Typeface; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'serif', label: 'Serif' },
  { value: 'monospace', label: 'Mono' },
]

export function SettingsDialog(): React.JSX.Element {
  const open = useWorkspaceStore((state) => state.settingsOpen)
  const settings = useWorkspaceStore((state) => state.settings)
  const setOpen = useWorkspaceStore((state) => state.setSettingsOpen)
  const update = useWorkspaceStore((state) => state.updateSettings)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Adjust Inkstone to match the way you read and write.</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 px-5 py-5">
          <section className="space-y-3">
            <SettingLabel title="Appearance" description="Choose how the workspace follows your desktop." />
            <div className="grid grid-cols-3 gap-2">
              {themes.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => update({ theme: value })}
                  className={cn('flex h-16 flex-col items-center justify-center gap-1.5 rounded-lg border text-xs transition-colors', settings.theme === value ? 'border-primary bg-primary/8 text-primary' : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted')}
                >
                  <Icon className="size-4" />{label}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-4 border-t border-border pt-5">
            <SettingLabel title="Editor" description="Typography changes apply immediately." />
            <div className="grid grid-cols-3 gap-2">
              {typefaces.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => update({ typeface: value })}
                  className={cn('h-8 rounded-md border text-xs transition-colors', settings.typeface === value ? 'border-primary bg-primary/8 text-primary' : 'border-border hover:bg-muted', value === 'serif' && 'font-serif', value === 'monospace' && 'font-mono')}
                >{label}</button>
              ))}
            </div>
            <div className="grid grid-cols-[120px_1fr_44px] items-center gap-3 text-xs">
              <span>Font size</span>
              <Slider min={12} max={24} step={1} value={[settings.fontSize]} onValueChange={([value]) => value && update({ fontSize: value })} />
              <span className="text-right tabular-nums text-muted-foreground">{settings.fontSize} px</span>
              <span>Line spacing</span>
              <Slider min={1.3} max={1.8} step={0.05} value={[settings.lineHeight]} onValueChange={([value]) => value && update({ lineHeight: value })} />
              <span className="text-right tabular-nums text-muted-foreground">{settings.lineHeight.toFixed(2)}</span>
            </div>
          </section>

          <section className="space-y-3 border-t border-border pt-5">
            <SettingToggle label="Check spelling while typing" checked={settings.spellCheck} onCheckedChange={(spellCheck) => update({ spellCheck })} />
            <SettingToggle label="Show line numbers" checked={settings.showLineNumbers} onCheckedChange={(showLineNumbers) => update({ showLineNumbers })} />
            <SettingToggle label="Synchronize editor and reader scrolling" checked={settings.synchronizedScrolling} onCheckedChange={(synchronizedScrolling) => update({ synchronizedScrolling })} />
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SettingLabel({ title, description }: { title: string; description: string }): React.JSX.Element {
  return <div><h3 className="text-xs font-semibold">{title}</h3><p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p></div>
}

function SettingToggle({ label, checked, onCheckedChange }: { label: string; checked: boolean; onCheckedChange(value: boolean): void }): React.JSX.Element {
  return <label className="flex items-center justify-between gap-4 text-xs"><span>{label}</span><Switch checked={checked} onCheckedChange={onCheckedChange} /></label>
}
