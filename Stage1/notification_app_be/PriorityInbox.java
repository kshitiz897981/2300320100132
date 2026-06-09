package Stage1.notification_app_be;

import java.util.*;

class Notification {
    int id;
    String type;
    long timestamp;
    boolean read;

    public Notification(int id, String type, long timestamp, boolean read) {
        this.id = id;
        this.type = type;
        this.timestamp = timestamp;
        this.read = read;
    }

    public long getPriorityScore() {
        int weight = switch (type.toLowerCase()) {
            case "placement" -> 3;
            case "result" -> 2;
            default -> 1;
        };

        return (weight * 1_000_000_000L) + timestamp;
    }

    @Override
    public String toString() {
        return "Notification{" +
                "id=" + id +
                ", type='" + type + '\'' +
                ", timestamp=" + timestamp +
                '}';
    }
}

public class PriorityInbox {

    public static List<Notification> getTop10Notifications(
            List<Notification> notifications) {

        PriorityQueue<Notification> minHeap =
                new PriorityQueue<>(
                        Comparator.comparingLong(Notification::getPriorityScore)
                );

        for (Notification notification : notifications) {

            if (notification.read)
                continue;

            minHeap.offer(notification);

            if (minHeap.size() > 10) {
                minHeap.poll();
            }
        }

        List<Notification> result = new ArrayList<>(minHeap);

        result.sort((a, b) ->
                Long.compare(
                        b.getPriorityScore(),
                        a.getPriorityScore()
                )
        );

        return result;
    }

    public static void main(String[] args) {

        List<Notification> notifications = Arrays.asList(
                new Notification(1, "placement", 1718000010, false),
                new Notification(2, "event", 1718000020, false),
                new Notification(3, "result", 1718000030, false),
                new Notification(4, "placement", 1718000040, false),
                new Notification(5, "event", 1718000050, true),
                new Notification(6, "result", 1718000060, false),
                new Notification(7, "placement", 1718000070, false),
                new Notification(8, "event", 1718000080, false),
                new Notification(9, "result", 1718000090, false),
                new Notification(10, "placement", 1718000100, false),
                new Notification(11, "event", 1718000110, false),
                new Notification(12, "placement", 1718000120, false)
        );

        List<Notification> top10 =
                getTop10Notifications(notifications);

        System.out.println("Top Priority Notifications:");

        top10.forEach(System.out::println);
    }
}
