import { Button } from '@/components/ui/button'
import Typography from '@/components/ui/typography'
import Video from 'next-video'
import Feature from './feature'
import {
  Timer,
  Workflow,
  HandCoins,
  MonitorPlay
} from 'lucide-react'
import Link from 'next/link'
import Marquee from '@/components/magicui/marquee'
import ReviewCard from '@/components/home/ReviewCard'
import WorkflowAnimated from '@/components/home/WorkFlowAnimated'
import reviews from '@/constants/reviews'
import AvatarCircles from '@/components/magicui/avatar-circles'

const firstRow = reviews.slice(0, reviews.length / 2)
const secondRow = reviews.slice(reviews.length / 2)

export default function Home() {
  const avatarUrls = [
    'https://avatars.githubusercontent.com/u/16860528',
    'https://avatars.githubusercontent.com/u/20110627',
    'https://avatars.githubusercontent.com/u/106103625',
    'https://avatars.githubusercontent.com/u/59228569'
  ]
  return (
    <div
      className="flex flex-col h-full md:py-36 md:px-32 pt-11 pb-24 px-8
        w-full items-center text-center gap-12"
    >
      <div className="flex flex-col gap-6 items-center">
        <Typography className="max-w-2xl" variant="h1">
          Transcode and Stream videos at scale
        </Typography>
        <AvatarCircles
          className="gap-1"
          numPeople={10}
          avatarUrls={avatarUrls}
        />
        <div className="flex gap-1">
          {Array.from({ length: 5 }, (_, index) => (
            <img
              key={index}
              src="/star.png"
              width={20}
              height={20}
              alt="star"
            />
          ))}
        </div>
        <Typography className="max-w-2xl" variant="h5">
          Delivering affordable and scalable media
          transcoding and streaming solutions for modern
          needs.
        </Typography>
        <Link href="/login">
          <Button size="tiny" variant="ghost">
            {`Get Started`}
          </Button>
        </Link>
        <WorkflowAnimated className="min-w-full" />
      </div>
      <div className="flex flex-col md:pt-24 md:gap-36 gap-24 items-center">
        <div className="flex flex-col gap-12 items-center">
          <Typography className="max-w-2xl" variant="h1">
            Quick solutions, less cost
          </Typography>
          <div className="flex md:flex-row flex-col gap-12">
            <Feature
              icon={<Timer size={24} />}
              headline="Transcode Fast"
              description="Each video of 1GB or 1hr is transcoded in multiple formats within 30 minutes"
            />
            <Feature
              icon={<HandCoins size={24} />}
              headline="Cost effective"
              description="Transcode and stream videos at a fraction of the cost of other providers."
            />
            <Feature
              icon={<MonitorPlay size={24} />}
              headline="Stream at scale"
              description="Stream the videos to millions of users without any hiccups."
            />
            <Feature
              icon={<Workflow size={24} />}
              headline="Easy to use"
              description="Simple and easy to use API to transcode and stream videos."
            />
          </div>
        </div>
        <div className="flex flex-col gap-6 max-w-2xl items-center">
          <Typography className="max-w-2xl" variant="h1">
            No manual septup required
          </Typography>
          <Typography className="max-w-2xl" variant="p">
            We also provide you with well designed video
            player that can be embeded into your website
            with just a single line of code. The below video
            is transcoded and being streamed through our
            service.
          </Typography>
          <Video src="https://cdn.streamscale.aksdev.me/666d55ed785875a3ffe67865/BigBunnyTrailer/master.m3u8" />
        </div>
      </div>
      <div
        className="relative flex h-full w-full flex-col items-center
          justify-center overflow-hidden rounded-lg border
          bg-background py-20 md:shadow-xl"
      >
        <Marquee pauseOnHover className="[--duration:20s]">
          {firstRow.map((review) => (
            <ReviewCard key={review.username} {...review} />
          ))}
        </Marquee>
        <Marquee
          reverse
          pauseOnHover
          className="[--duration:20s]"
        >
          {secondRow.map((review) => (
            <ReviewCard key={review.username} {...review} />
          ))}
        </Marquee>
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-1/3
            bg-gradient-to-r from-white dark:from-background"
        ></div>
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-1/3
            bg-gradient-to-l from-white dark:from-background"
        ></div>
      </div>
      <div className="flex flex-col gap-6 items-center">
        <Typography className="max-w-2xl" variant="h1">
          Get in touch
        </Typography>
        <div>Book a demo, or hop on a call</div>
        <Link
          href="https://calendly.com/d/ck4k-tdc-qm2/one-off-meeting"
          target="_blank"
        >
          <Button size="tiny" variant="ghost">
            {`Book now`}
          </Button>
        </Link>
      </div>
    </div>
  )
}
