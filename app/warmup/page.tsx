import { defaultWarmupRequest } from "@/features/warmup/model/defaultRequest";
import { WarmupWorkspace } from "@/features/warmup/ui/WarmupWorkspace";
import { generateProgression } from "@/lib/generators/progression/generateProgression";

const progression = generateProgression(
    defaultWarmupRequest.settings,
    defaultWarmupRequest.seed,
    defaultWarmupRequest.generatorVersion
);

export default function WarmupPage() {
    return <WarmupWorkspace progression={progression} />;
}
