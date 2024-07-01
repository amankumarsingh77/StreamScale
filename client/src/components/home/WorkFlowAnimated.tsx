'use client'

import { cn } from '@/lib/utils'
import { AnimatedBeam } from '@/components/magicui/animated-beam'
import React, { forwardRef, useRef } from 'react'

const Circle = forwardRef<
  HTMLDivElement,
  { className?: string; children?: React.ReactNode }
>(({ className, children }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        `z-10 flex h-14 w-14 items-center justify-center rounded-full
          border-2 bg-white p-3
          shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)]`,
        className
      )}
    >
      {children}
    </div>
  )
})

export default function WorkflowAnimated({
  className
}: {
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const div1Ref = useRef<HTMLDivElement>(null)
  const div2Ref = useRef<HTMLDivElement>(null)
  const div3Ref = useRef<HTMLDivElement>(null)
  const div4Ref = useRef<HTMLDivElement>(null)
  const div5Ref = useRef<HTMLDivElement>(null)
  const div6Ref = useRef<HTMLDivElement>(null)

  return (
    <div
      className={cn(
        `relative flex w-full max-w-[500px] items-center
          justify-center overflow-hidden rounded-lg border
          bg-background p-10 md:shadow-xl`,
        className
      )}
      ref={containerRef}
    >
      <div
        className="flex h-full w-full flex-row items-stretch justify-between
          gap-10"
      >
        <div className="flex flex-col justify-center">
          <Circle ref={div1Ref}>
            <Icons.user />
          </Circle>
        </div>
        <div className="flex flex-col justify-center">
          <Circle ref={div2Ref} className="h-16 w-16">
            <Icons.nodejs />
          </Circle>
        </div>
        <div className="flex flex-col justify-center gap-2">
          <Circle ref={div3Ref}>
            <Icons.awss3 />
          </Circle>
          <Circle ref={div4Ref}>
            <Icons.awsEcr />
          </Circle>
          <Circle ref={div5Ref}>
            <Icons.awsEcs />
          </Circle>
          <Circle ref={div6Ref}>
            <Icons.cloudflare />
          </Circle>
        </div>
      </div>

      {/* AnimatedBeams */}
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div1Ref}
        toRef={div2Ref}
        duration={3}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div3Ref}
        toRef={div2Ref}
        duration={3}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div3Ref}
        toRef={div4Ref}
        duration={3}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div4Ref}
        toRef={div5Ref}
        duration={3}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div5Ref}
        toRef={div6Ref}
        duration={3}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div6Ref}
        toRef={div2Ref}
        duration={3}
      />
    </div>
  )
}

const Icons = {
  awss3: () => (
    <img
      src="/s3.png"
      className="rounded-full"
      alt="Amazon S3"
    />
  ),
  awsEcr: () => (
    <img
      src="./ecr.png"
      className="rounded-full"
      alt="Amazon ECR"
    />
  ),
  awsSqs: () => (
    <img
      src="./sqs.png"
      className="rounded-full"
      alt="Amazon SQS"
    />
  ),
  awsEcs: () => (
    <img
      src="./ecs.png"
      className="rounded-full"
      alt="Amazon ECS"
    />
  ),
  nodejs: () => (
    <img
      src="./nodejs.png"
      className="rounded-full"
      alt="Node.js"
    />
  ),
  cloudflare: () => (
    <img
      src="./cloudflare.png"
      className="rounded-full"
      alt="Cloudflare"
    />
  ),
  user: () => (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#000000"
      strokeWidth="2"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
