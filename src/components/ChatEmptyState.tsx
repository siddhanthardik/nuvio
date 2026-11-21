import { api, useStore, type Bot } from "@/state/store";
import { useAdvancedMode } from "@/lib/interface-mode";
import { BotAvatar } from "./Avatar";
import { RenameTitle } from "./RenameTitle";

/** A chat with no messages yet: the bot, its name (renamable in Advanced) and what it is for. */
export function EmptyChat({ bot }: { bot: Bot }) {
  const { dispatch } = useStore();
  const advanced = useAdvancedMode();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-center">
      <BotAvatar bot={bot} state="idle" size={64} motion="none" motionKey={0} />
      {!advanced ? <div className="text-[17px] font-semibold text-ink">{bot.name}</div> : <RenameTitle
        value={bot.name}
        onCommit={(name) => {
          if (window.ogb?.remoteClient?.active) {
            void api(`/api/bots/${bot.id}/profile`, { method: "PATCH", body: JSON.stringify({ name }) })
              .then(({ bot: updated }) => dispatch({ type: "botPatched", bot: updated }))
              .catch((cause) => dispatch({ type: "error", message: cause instanceof Error ? cause.message : String(cause) }));
          } else {
            dispatch({ type: "updateBot", botId: bot.id, patch: { name } });
          }
        }}
        className="text-[17px] font-semibold text-ink"
        inputClassName="rounded bg-inset px-1.5 py-0.5 text-center text-[17px] font-semibold"
      />}
      <div className="max-w-[440px] text-[14px] leading-relaxed text-ink-secondary">
        {bot.description || "Welcome to Nuvio. I help your team coordinate patient enquiries, treatment journeys, consultations, documents, and follow-ups."}
      </div>
      <div className="mt-3 flex max-w-[520px] flex-wrap items-center justify-center gap-2">
        {[
          "Review patient enquiries",
          "View pending coordinator tasks",
          "Review communication drafts",
          "Check patient journey status",
        ].map((askText) => (
          <button
            key={askText}
            type="button"
            data-nuvio-ask={askText}
            onClick={() => dispatch({ type: "send", botId: bot.id, text: askText, threadId: bot.threadId })}
            className="rounded-full border border-hairline/70 bg-app px-3.5 py-1.5 text-[13px] font-medium text-ink transition-colors hover:bg-raised-hover"
          >
            {askText}
          </button>
        ))}
      </div>
    </div>
  );
}
