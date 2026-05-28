-- Team members (configurable by super admin)
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  title VARCHAR(100) NOT NULL,
  bio TEXT,
  photo_url VARCHAR(500),
  linkedin_url VARCHAR(500),
  display_order INT DEFAULT 99,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO team_members (name, title, bio, display_order)
SELECT 'Shiv Kayal', 'Chief Executive Officer',
  'Shiv is the co-founder and CEO of Arintu, with a lifelong passion for making quality education accessible to every corner of the world. Drawing on 15+ years of experience across education policy, technology, and community development, he has built programmes that have reached thousands of learners across multiple continents. He believes that a great teacher and the right learning environment can change the trajectory of any student''s life.',
  1
WHERE NOT EXISTS (SELECT 1 FROM team_members WHERE name = 'Shiv Kayal');

INSERT INTO team_members (name, title, bio, display_order)
SELECT 'Ashish Mathur', 'Vice President, Technology',
  'Ashish leads Arintu''s technology organisation, owning engineering, product, and platform infrastructure. With 12+ years of experience building scalable software systems, he has a deep commitment to using technology as a lever for social good. He architected the Arintu platform from the ground up and continues to drive its evolution toward a personalised, AI-assisted learning experience for every student.',
  2
WHERE NOT EXISTS (SELECT 1 FROM team_members WHERE name = 'Ashish Mathur');

-- Cities (empty by default, super admin can add)
CREATE TABLE IF NOT EXISTS cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  country_id UUID REFERENCES countries(id) ON DELETE SET NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 99,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Book Club submissions
CREATE TABLE IF NOT EXISTS book_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amazon_url VARCHAR(1000) NOT NULL,
  title VARCHAR(200) NOT NULL,
  author VARCHAR(200),
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
