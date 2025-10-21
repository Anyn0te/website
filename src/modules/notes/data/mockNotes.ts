import { Note } from "../types";

const createMedia = (
  types: Array<"image" | "audio">,
  urls: Array<string | null | undefined>
) =>
  types.map((type, index) => ({
    type,
    url: urls[index] ?? null,
  }));

export const mockNotes: Note[] = [
  {
    id: 1761035931180.2017,
    title: "r2",
    content: "r2",
    isFollowing: false,
    media: createMedia(["audio"], ["/media/wNNNNcnDr8.mp3"]),
  },
  {
    id: 1761034866452.72,
    title: "Robin's note",
    content: "music taste\r\n",
    isFollowing: false,
    media: createMedia(["audio"], ["/media/0wxY9XTE6N.mp3"]),
  },
  {
    id: 1760995877113.9456,
    title: "Test to see if redirecting working file",
    content: "hey it works fine!",
    isFollowing: false,
    media: [],
  },
  {
    id: 1760977867461.3152,
    title: "last ",
    content: "hmmmmmmmm",
    isFollowing: false,
    media: [],
  },
  {
    id: 1760972944205.8674,
    title: "Hello world",
    content: "Ami kamer na",
    isFollowing: false,
    media: [],
  },
  {
    id: 1760972121946.1301,
    title: "heyyy",
    content: "done",
    isFollowing: false,
    media: [],
  },
  {
    id: 1760971542882.421,
    title: "ami valo manush vai",
    content: "r kisu bolla lagbe na",
    isFollowing: false,
    media: createMedia(["audio"], ["/media/C_BW0PK2EV.mp3"]),
  },
  {
    id: 1760971251545.4062,
    title: "heyyyy",
    content: "i am new here whatdya think :>",
    isFollowing: false,
    media: createMedia(["audio"], ["/media/S9vVbyxVAh.mp3"]),
  },
  {
    id: 1760970487804.7048,
    title: "okk",
    content: "sdffddddddd dfg",
    isFollowing: false,
    media: createMedia(["audio"], ["/media/oq_VmtNFhzn-N_NGv8RVZ.mpeg"]),
  },
  {
    id: 1760970427671.1404,
    title: "hey",
    content: "okk",
    isFollowing: false,
    media: createMedia(["image"], ["/media/QLJvHN7NUzoRry9RjgGcb.jpeg"]),
  },
  {
    id: 1760970130018,
    title: "Hi new here!",
    content: "Okkk",
    isFollowing: false,
    media: createMedia(["image"], [null]),
  },
  {
    id: 1760970010769,
    title: "Heyy",
    content: "Okkkkk",
    isFollowing: false,
    media: [],
  },
  {
    id: 1,
    title: "A Deeply Personal Thought",
    content:
      "Sometimes I wonder what it's like to truly be alone, not lonely, but truly detached from all expectations and ties. It's a scary but liberating idea...",
    isFollowing: true,
    media: [],
  },
  {
    id: 2,
    title: "The Sound of Rain on Tin",
    content:
      "I recorded the sound of the rain outside my window today. It sounds melancholic, but also peaceful.",
    isFollowing: true,
    media: createMedia(["audio"], ["/media/mock_audio.mp3"]),
  },
  {
    id: 3,
    title: "A Picture of Serenity",
    content:
      "This photo captures the most serene moment I've experienced all year. It was a perfect sunset.",
    isFollowing: false,
    media: createMedia(["image"], ["/media/mock_image_1.jpg"]),
  },
  {
    id: 4,
    title: "Just a Simple Idea",
    content:
      "If everyone just took one minute a day to breathe, the world would be a much better place.",
    isFollowing: false,
    media: [],
  },
  {
    id: 5,
    title: "Another Random Post",
    content:
      "Thinking about where my life will be in five years. The uncertainty is part of the fun, right?",
    isFollowing: false,
    media: [],
  },
  {
    id: 6,
    title: "Hidden Thought Six",
    content:
      "This is a sixth post to test the expansion feature. It should only appear after the first click on the arrow.",
    isFollowing: true,
    media: [],
  },
  {
    id: 7,
    title: "A New Insight",
    content:
      "I realized the key to happiness is low expectations and plenty of coffee.",
    isFollowing: false,
    media: [],
  },
  {
    id: 8,
    title: "Media Test Note",
    content:
      "Testing a new audio file upload. Hope it works smoothly with the floating UI.",
    isFollowing: false,
    media: createMedia(["audio"], ["/media/mock_audio_2.mp3"]),
  },
  {
    id: 9,
    title: "Final Mock Note",
    content:
      "The grid layout feels much cleaner than a list, especially for visual posts.",
    isFollowing: true,
    media: createMedia(["image"], ["/media/mock_image_2.jpg"]),
  },
];

export const getMockNotes = () =>
  mockNotes.map((note) => ({
    ...note,
    media: note.media.map((mediaItem) => ({ ...mediaItem })),
  }));
