'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Sparkles, Loader2, TestTube2 } from 'lucide-react'

const TEST_STORIES = [
    {
        title: "The Chase (Bracket Demo)",
        text: `Marcus sprinted through the neon-lit streets of downtown, his breath visible in the cold night air. Behind him, the sound of heavy boots echoed off the wet pavement.

@marcus [ducked into a narrow alley, leaped over a chain-link fence, slid under a parked car] while glancing back at his pursuers.

Sarah waited on the rooftop above, her sniper rifle trained on the alley entrance. She spoke into her earpiece: "I've got eyes on you. Two hostiles approaching from the east."

The rain began to fall harder as Marcus pulled out his pistol. This was it. No more running.`
    },
    {
        title: "Morning Coffee",
        text: `Elena sat at the corner table of the small cafe, steam rising from her cup. The morning sun streamed through the window, casting long shadows across the wooden floor.

She opened her laptop and began to type. Outside, the city was waking up. A yellow taxi pulled up to the curb. A mother pushed a stroller down the sidewalk.

The barista, a young man with kind eyes, brought her a fresh croissant. She smiled and nodded in thanks.

This was her favorite part of the day - before the meetings, before the calls. Just her, her coffee, and her thoughts.`
    },
    {
        title: "Bad Newz: Battle Rapper, Street Survivor, and Controversy",
        text: `Bad Newz: Battle Rapper, Street Survivor, and Controversy

BullPen Beginnings and Reputation

Bad Newz (real name Antwan Ragland) emerged from Rocky Mount, North Carolina, carving out a name on the battle rap circuit. He became a staple in John John Da Don's BullPen Battle League, where his aggressive delivery and street persona made an impression. In 2017 he headlined BullPen's Southern Crown 2 event against Loso, then an undefeated rising star – a matchup many considered Loso's toughest test at the time.

Bad Newz's performances on BullPen often featured intense "street talk" and a no-nonsense demeanor that backed up his moniker. By taking on increasingly big names (from local prospects to established veterans), he built a reputation as a fearless competitor. In fact, he eventually stood toe-to-toe with top-tier URL legends like Tay Roc and Arsonal on the BullPen stage, proving he could hang with battle rap's elite.

Despite never being touted as an all-time great lyrically, Bad Newz garnered respect for his authenticity and tenacity. He portrayed himself as someone who lived what he rapped – a street-certified battler who wasn't just acting tough for the cameras. That gritty credibility became a core part of his brand. However, it would soon be tested by real-life events in a way that few in battle rap had ever experienced.

A Near-Fatal Night and Unshakeable Comeback

Bad Newz's toughest battle happened offstage: a brush with death that nearly ended everything. In late 2018, reports surfaced that Bad Newz had been shot three times in a violent incident, leaving him in critical condition. Fellow battlers like T-Top and Loso took to social media to ask for prayers; Newz was rushed into emergency surgery and, against the odds, pulled through.

This real-life trauma could have sidelined anyone – but Bad Newz's next move shocked the battle rap community. Just two weeks after surviving the shooting, while still healing from his wounds, he stepped back onto the stage to battle the renowned Tay Roc in Atlanta.

Fans watched in awe as Bad Newz faced Tay Roc at a BullPen event (aptly timed during Super Bowl weekend) with undiminished bravado. He later recounted that night, describing how he went from a hospital bed to memorizing rhymes, determined to honor the battle booking even if his life had almost been cut short.

The crowd's reaction was electric – not only was it a high-profile one-round clash, but it was happening mere days after a life-threatening ordeal. Bad Newz's ability to deliver hard-hitting bars while likely still bandaged underscored his resilience. This comeback cemented his image as a street survivor: he literally took bullets in real life and still wouldn't back down from a rap battle.

In the aftermath, his legend grew – the story of a man who nearly died and then stood before Tay Roc without fear. Yet, the very circumstances surrounding that shooting would later give rise to the biggest controversy of his career.

Paperwork and the Snitching Scandal

For years, quiet whispers followed Bad Newz, hinting that something in his past wasn't aligning with his hardnosed reputation. As early as 2020, opponents began hinting at "paperwork" – implying there were documents suggesting Bad Newz had cooperated with law enforcement. Battle rappers Ace Amin and Geechi Gotti both alluded to a secret in Newz's history during battles (in 2020 and 2023 respectively), but without concrete proof it remained just an ominous rumor.

Bad Newz consistently portrayed himself as a street dude abiding by the underworld code, so any suggestion that he might have "snitched" was explosive – yet until evidence emerged, it was just battle rap hearsay.

That evidence finally surfaced in early 2025, and it hit the battle rap scene like a bomb. Mere days before Bad Newz was scheduled for a high-profile matchup against Virginia veteran Ave, another battler (Jakkboy Maine) leaked official paperwork online. The documents appeared to show that after Bad Newz was shot, he identified the shooter to police and even picked the suspect out of a lineup – cooperation that, in street circles, amounts to snitching.

The timing couldn't have been worse: with four days until the Ave battle, the entire community erupted in debate. Social media and forums swirled with the story, and what had been whispers was now a very public accusation backed by receipts. Suddenly, Bad Newz's authenticity was under direct fire.

Going into the battle at T-Top's No Cut event, all eyes were on Bad Newz. What was once an undercard matchup turned into the night's most anticipated showdown, for all the wrong reasons. Fans didn't just want to see lyrical skill – they wanted to see if and how Ave would confront Newz about the snitching allegations, and how Bad Newz would possibly defend himself.

The venue was thick with tension; this wasn't just battle rap theater anymore, but a man's entire street credibility on trial. When Bad Newz and Ave finally clashed, the atmosphere was surreal. Ave did address the elephant in the room, though some felt he could have gone even harder at the angle.

But the most dramatic moment came from Bad Newz himself. In a move that stunned the crowd, Bad Newz openly admitted on stage that he "told". In his first round, he shouted the confession: "I told! But the...charges got acquitted."

In that line, Bad Newz acknowledged that he had given information to authorities – however, he quickly pointed out that the man who shot him ultimately was never convicted (the charges didn't stick). This was essentially Newz's justification: yes, he talked to the police while on his deathbed, but (in his view) since it didn't result in someone going to prison, did it really count as snitching?

That rationalization landed with a thud for many observers. In battle rap, simply admitting "I told" was nuclear – a moment virtually unheard of in a culture that prides itself on the slogan "no snitching."

After dropping that bombshell admission, Bad Newz attempted an unusual strategy to turn the tables. In a bizarre twist, he devoted part of his round to accusing Ave of an unsubstantiated heinous act (calling his opponent a pedophile with no evidence), seemingly as a desperate distraction. The crowd reaction was largely shock and confusion; it was evident that Bad Newz was scrambling to shift the narrative. The ploy fell flat.

As the battle went on, the energy in the room told the story: the audience had largely turned cold on Bad Newz. His usual aggression and charisma were met with awkward silence – even crickets wouldn't cheer. Ave went on to win the battle convincingly in a 3–0 sweep, but the win was almost an afterthought.

The real headline was Bad Newz's self-inflicted implosion on stage. The moment the words "I told" left his mouth, many felt the battle itself was effectively over. In the court of public opinion, Bad Newz had lost far more than just a battle – he had lost the very badge of authenticity that he built his career on.

Fallout and Legacy

The fallout from the paperwork scandal was swift and severe. In the months after, Bad Newz's name became synonymous with the very thing he had always railed against in his raps. Within battle rap's hardcore fanbase, his reputation was shattered – "unrepairable," as one recap bluntly put it.

In a culture that puts a premium on authenticity and street credibility, being labeled a confirmed snitch is perhaps the worst stigma a battle rapper can carry. Bad Newz's credibility took "a massive hit" and his brand, as one commentator described, fell to "a 400 credit score that can't be salvaged".

In practical terms, this meant that any tough talk or street bars he delivered going forward would be met with skepticism or even heckling. The next time he stood in front of an opponent, everyone knew his opponent could (and likely would) use that angle against him mercilessly.

Yet, the story doesn't end with Bad Newz disappearing – interestingly, he continued to battle despite the controversy. In interviews after the Ave match, even Ave himself noted wryly that Bad Newz would still get booked for battles and that plenty of "street rappers" in the culture would still be willing to stand across from him.

And that has proven true: Bad Newz has indeed returned to smaller league events and local cards since the scandal, determined to prove he's more than this mistake. His logic seems to be that he's a battle rapper at heart and will keep doing what he loves, even if respect is hard to come by.

Some in the community have a degree of sympathy – noting that if Bad Newz truly thought he was dying when he gave the police a name, it blurs the lines between survival instinct and street code. Others, however, find no excuse, pointing out that he boasted a gangster image for years but didn't live up to that code when it mattered.

Being a "civilian" is not a crime, they argue, but portraying oneself as a hardcore thug while acting otherwise is a fatal sin in battle rap.

The Bad Newz saga has undeniably become one of battle rap's most compelling real-life storylines – a cautionary tale of how the streets and the stage intersect. It's a story of ambition, loyalty, and the harsh consequences when the persona one sells to the crowd collides with the person one is when real bullets fly.

From his early BullPen glory to the hospital bed to the dramatic face-off with his own reputation, Bad Newz's journey has been anything but ordinary. He survived a shooting and refused to quit, demonstrating incredible toughness. But in doing so, he made a choice – cooperating with law enforcement – that would come back to haunt him in the arena he loved most.

Today, Bad Newz battles on, carrying the weight of a controversial legacy. His name now evokes a mix of respect for his grit and disapproval for his choices. In the world of battle rap, where every personal angle can become a weapon, Bad Newz inadvertently handed his opponents a loaded gun. The very "bad news" he once delivered to others in his bars has become his own story – one of perseverance, paradox, and the unforgiving nature of keeping it real in the spotlight.`
    }
]

interface StoryInputSectionProps {
    onExtractShots: (title: string, storyText: string) => Promise<void>
    isExtracting: boolean
    extractionProgress?: number
}

/**
 * Story Input Section - Paste story text and extract shots
 */
export default function StoryInputSection({
    onExtractShots,
    isExtracting,
    extractionProgress = 0
}: StoryInputSectionProps) {
    const [title, setTitle] = useState('')
    const [storyText, setStoryText] = useState('')

    const handleExtract = async () => {
        if (!title.trim() || !storyText.trim()) return
        await onExtractShots(title, storyText)
    }

    const canExtract = title.trim().length > 0 && storyText.trim().length > 10 && !isExtracting

    return (
        <div className="space-y-6">
            {/* Title Input */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">
                    Project Title
                </label>
                <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter your story project title..."
                    className="bg-slate-800 border-slate-700 text-white"
                    disabled={isExtracting}
                />
            </div>

            {/* Story Text Input */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">
                    Story Text
                </label>
                <Textarea
                    value={storyText}
                    onChange={(e) => setStoryText(e.target.value)}
                    placeholder="Paste your story text here... The AI will extract visual scenes and create shot prompts."
                    className="bg-slate-800 border-slate-700 text-white min-h-[300px] resize-y"
                    disabled={isExtracting}
                />
                <p className="text-xs text-slate-500">
                    {storyText.length} characters
                </p>
            </div>

            {/* Extraction Progress */}
            {isExtracting && (
                <div className="space-y-2 p-4 bg-slate-800 rounded-lg border border-slate-700">
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Extracting shots from your story...</span>
                    </div>
                    <Progress value={extractionProgress} className="h-2" />
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
                <Button
                    onClick={() => {
                        const story = TEST_STORIES[Math.floor(Math.random() * TEST_STORIES.length)]
                        setTitle(story.title)
                        setStoryText(story.text)
                    }}
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-800"
                    disabled={isExtracting}
                >
                    <TestTube2 className="w-4 h-4 mr-2" />
                    Test Story
                </Button>
                <Button
                    onClick={handleExtract}
                    disabled={!canExtract}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50"
                    size="lg"
                >
                    {isExtracting ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Extracting...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Extract Shots
                        </>
                    )}
                </Button>
            </div>
        </div>
    )
}
