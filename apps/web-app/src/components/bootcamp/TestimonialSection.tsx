import Image from 'next/image'

export function TestimonialSection() {
  return (
    <section id="testimonial-section">
      <div className="lg-container">
        <div className="quote">
          <Image 
            src="/assets/bootcamp/quote.png" 
            alt=""
            width={40}
            height={40}
            className="mark left-mark" 
          />
          <span>
            Exercism is an incredible platform and Jeremy is an outstanding teacher. 
            This is going to be an amazing bootcamp.
          </span>
          <Image 
            src="/assets/bootcamp/quote.png" 
            alt=""
            width={40}
            height={40}
            className="mark right-mark" 
          />
        </div>
        <div className="person">
          <div className="text">
            <div className="name">Loretta Bresciani Murray</div>
            <div className="description">Senior Consultant</div>
          </div>
          <Image 
            src="/assets/bootcamp/loretta.png" 
            alt="Loretta Bresciani Murray"
            width={80}
            height={80}
          />
        </div>
      </div>
    </section>
  )
}